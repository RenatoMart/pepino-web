"""Núcleo del análisis de la foto de un pepino con dos modelos ONNX.

Un detector YOLO11n (640 px) decide si hay un pepino y dónde está; un clasificador YOLO11n-cls (320 px) da la categoría.

Solo usa numpy y OpenCV (el modelo se ejecuta con cv2.dnn), así el paquete queda liviano para Vercel.
El preprocesamiento repite el del entrenamiento (Roboflow v1): ajustar a 320x320 con bordes negros.
"""
import json
import os

import cv2
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RUTA = os.path.join(AQUI, "_modelo")
CONFIG = json.load(open(os.path.join(RUTA, "modelo.json"), encoding="utf-8"))
LADO = int(CONFIG["imgsz"])
LADO_DET = int(CONFIG["deteccion"]["imgsz"])
CONF_DET = float(CONFIG["deteccion"]["conf_minima"])
IOU_NMS = 0.7
NOMBRES = {"MADUROS": "Maduro", "SOBREMADUROS": "Sobremaduro"}
MENSAJE_SIN_PEPINO = "No se reconoce un pepino en la foto."

_red = None
_det = None


def red():
    global _red
    if _red is None:
        _red = cv2.dnn.readNetFromONNX(os.path.join(RUTA, "best.onnx"))
    return _red


def detector():
    global _det
    if _det is None:
        _det = cv2.dnn.readNetFromONNX(os.path.join(RUTA, "deteccion.onnx"))
    return _det


def ajustar(rgb, lado=LADO):
    """Reduce la imagen para que quepa en lado x lado sin deformarla y rellena con negro."""
    h, w = rgb.shape[:2]
    if (h, w) == (lado, lado):
        return rgb
    e = min(lado / h, lado / w)
    nh, nw = max(1, round(h * e)), max(1, round(w * e))
    im = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA if e < 1 else cv2.INTER_LINEAR)
    lienzo = np.zeros((lado, lado, 3), np.uint8)
    y, x = (lado - nh) // 2, (lado - nw) // 2
    lienzo[y:y + nh, x:x + nw] = im
    return lienzo


def detectar(rgb):
    """Devuelve la caja de mayor confianza como (x0, y0, x1, y1, confianza, clase) normalizada a la foto original, o None."""
    h, w = rgb.shape[:2]
    im = ajustar(rgb, LADO_DET)
    e = min(LADO_DET / h, LADO_DET / w); ox, oy = (LADO_DET - w * e) / 2, (LADO_DET - h * e) / 2
    x = np.ascontiguousarray(im.transpose(2, 0, 1)[None].astype(np.float32) / 255.0)
    n = detector(); n.setInput(x)
    s = n.forward()[0].T                       # (8400, 4 + clases): cx, cy, ancho, alto y una puntuación por clase
    puntaje = s[:, 4:].max(axis=1); ok = puntaje >= CONF_DET
    if not ok.any():
        return None
    s, puntaje = s[ok], puntaje[ok]
    cajas = [[float(a - c / 2), float(b - d / 2), float(c), float(d)] for a, b, c, d in s[:, :4]]
    i = cv2.dnn.NMSBoxes(cajas, puntaje.astype(float).tolist(), CONF_DET, IOU_NMS)
    if len(i) == 0:
        return None
    k = int(np.asarray(i).reshape(-1)[0]); cx, cy, bw, bh = (float(v) for v in s[k, :4])
    x0, y0 = max(0.0, (cx - bw / 2 - ox) / (w * e)), max(0.0, (cy - bh / 2 - oy) / (h * e))
    x1, y1 = min(1.0, (cx + bw / 2 - ox) / (w * e)), min(1.0, (cy + bh / 2 - oy) / (h * e))
    return x0, y0, x1, y1, float(puntaje[k]), int(s[k, 4:].argmax())


def probabilidades(im320):
    x = np.ascontiguousarray(im320.transpose(2, 0, 1)[None].astype(np.float32) / 255.0)
    n = red()
    n.setInput(x)
    p = n.forward().reshape(-1).astype(np.float64)
    if abs(p.sum() - 1) > 1e-3:  # por si el modelo exportado entrega valores sin softmax
        p = np.exp(p - p.max())
        p /= p.sum()
    return p


def medidas_color(im320):
    """Devuelve cuánto de la foto ocupa la mancha verde-amarilla mayor y qué parte del color vivo es amarilla."""
    hsv = cv2.cvtColor(im320, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0].astype(np.float32) * 2, hsv[..., 1], hsv[..., 2]  # h en grados
    # amarillo / (amarillo + verde), con la misma definición del informe (solo píxeles de color vivo)
    vivo = (v >= 50) & (s >= 60)
    na, nv = int((vivo & (h >= 45) & (h < 72)).sum()), int((vivo & (h >= 72) & (h < 165)).sum())
    # presencia: umbrales amplios, porque el pepino maduro es verde muy oscuro
    fruto = ((v >= 20) & (s >= 20) & (h >= 45) & (h < 190)).astype(np.uint8)
    fruto = cv2.morphologyEx(fruto, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    fruto = cv2.morphologyEx(fruto, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, _, est, _ = cv2.connectedComponentsWithStats(fruto)
    foto = int((im320.max(axis=2) > 12).sum()) or 1  # zona con imagen (sin los bordes negros)
    mayor = int(est[1:, cv2.CC_STAT_AREA].max()) if n > 1 else 0
    return {"fraccion": float(mayor / foto), "amarillo": float(na / max(1, na + nv))}


def analizar(rgb):
    """rgb: imagen uint8 (alto, ancho, 3). Devuelve el resultado listo para enviar a la interfaz."""
    d = detectar(rgb)
    if d is None:
        return {"pepino_detectado": False, "mensaje": MENSAJE_SIN_PEPINO}
    x0, y0, x1, y1, conf_caja, k_det = d
    im = ajustar(rgb)
    m = medidas_color(im)
    p = probabilidades(im)
    k = int(p.argmax())
    clase = CONFIG["clases"][k]
    discrepa = CONFIG["deteccion"]["clases"][k_det] != clase
    return {
        "pepino_detectado": True,
        "categoria": NOMBRES[clase],
        "confianza": round(float(p[k]), 3),
        "p_sobremaduro": round(float(p[CONFIG["clases"].index("SOBREMADUROS")]), 3),
        "dudoso": bool(p[k] < CONFIG["umbral_duda"] or discrepa),
        "umbral_duda": float(CONFIG["umbral_duda"]),
        "amarillo_pct": round(m["amarillo"] * 100, 1),
        "caja": [round(x0, 4), round(y0, 4), round(x1, 4), round(y1, 4)],
        "confianza_caja": round(conf_caja, 3),
        "pepino_pct_imagen": round(100 * (x1 - x0) * (y1 - y0), 1),
        "discrepa_detector": bool(discrepa),
    }
