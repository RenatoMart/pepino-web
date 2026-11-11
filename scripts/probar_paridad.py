"""Comprueba la función web contra el conjunto de prueba del entrenamiento.

Uso: .venvapi/bin/python scripts/probar_paridad.py <carpeta PYTHON del proyecto de entrenamiento>
Debe dar la misma matriz que Colab ([[133, 10], [5, 124]], 257/272). También calibra la comprobación "hay pepino".
"""
import json, sys, time
from pathlib import Path
import cv2
import numpy as np
RAIZ = Path(__file__).resolve().parent.parent
ENT = Path(sys.argv[1])
sys.path.insert(0, str(RAIZ / "api"))
import _nucleo as N
clases = N.CONFIG["clases"]; M = [[0, 0], [0, 0]]; t = []; sin = 0
for i, c in enumerate(clases):
    for f in sorted((ENT / "datos/dataset/test" / c).glob("*.jpg")):
        rgb = cv2.cvtColor(cv2.imread(str(f)), cv2.COLOR_BGR2RGB)
        t0 = time.time(); r = N.analizar(rgb); t.append(time.time() - t0); json.dumps(r)
        p = N.probabilidades(N.ajustar(rgb)); M[i][int(p.argmax())] += 1; sin += not r["pepino_detectado"]
n = sum(map(sum, M)); t.sort()
print(f"prueba: matriz {M} | aciertos {M[0][0] + M[1][1]}/{n} | marcadas 'sin pepino': {sin} | mediana {t[len(t) // 2] * 1000:.0f} ms")
fr = []
for s in ("train", "val", "test"):
    for f in (ENT / "datos/dataset" / s).rglob("*.jpg"):
        fr.append(N.medidas_color(cv2.cvtColor(cv2.imread(str(f)), cv2.COLOR_BGR2RGB))["fraccion"])
fr = np.array(fr)
print(f"{len(fr)} fotos | fracción verde-amarilla: p0.5 {np.percentile(fr, .5):.3f} | mediana {np.median(fr):.3f}")
