"""Núcleo del análisis: clasifica la foto de un pepino en maduro o sobremaduro con el modelo ONNX.

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
NOMBRES = {"MADUROS": "Maduro", "SOBREMADUROS": "Sobremaduro"}
MENSAJE_SIN_PEPINO = "No se reconoce un pepino en la foto."

_red = None


def red():
    global _red
    if _red is None:
        _red = cv2.dnn.readNetFromONNX(os.path.join(RUTA, "best.onnx"))
    return _red


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


def hay_pepino(m):
    """Comprobación mínima: el clasificador siempre responde algo, así que se rechazan las fotos sin nada verde o amarillo.

    Es una comprobación débil (un objeto verde cualquiera la pasa); el modelo no tiene una clase "sin pepino".
    """
    return m["fraccion"] >= CONFIG.get("fraccion_minima", 0.01)


def analizar(rgb):
    """rgb: imagen uint8 (alto, ancho, 3). Devuelve el resultado listo para enviar a la interfaz."""
    im = ajustar(rgb)
    m = medidas_color(im)
    if not hay_pepino(m):
        return {"pepino_detectado": False, "mensaje": MENSAJE_SIN_PEPINO}
    p = probabilidades(im)
    k = int(p.argmax())
    clase = CONFIG["clases"][k]
    return {
        "pepino_detectado": True,
        "categoria": NOMBRES[clase],
        "confianza": round(float(p[k]), 3),
        "p_sobremaduro": round(float(p[CONFIG["clases"].index("SOBREMADUROS")]), 3),
        "dudoso": bool(p[k] < CONFIG["umbral_duda"]),
        "umbral_duda": float(CONFIG["umbral_duda"]),
        "amarillo_pct": round(m["amarillo"] * 100, 1),
        "pepino_pct_imagen": round(m["fraccion"] * 100, 1),
    }
