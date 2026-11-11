# Madurez del pepino · UPN

Web que clasifica la foto de un pepino en **maduro** o **sobremaduro** con YOLO11n-cls (Ultralytics).
El modelo se entrenó en Google Colab con el conjunto `pepino-madurez` v1 de Roboflow (2 715 fotos) y acertó
94,5 % en la prueba (257 de 272).

## Cómo funciona
- `src/`: Next.js 16 (App Router), Tailwind 4 y TypeScript. La portada (`src/components/InicioPepino.tsx`) muestra un
  pepino que revienta y deja salir el logo de la UPN.
- `api/analizar.py`: función de Python en Vercel. Recibe la foto, la ajusta a 320 × 320 con bordes negros (igual que
  en el entrenamiento) y ejecuta `api/_modelo/best.onnx` con `cv2.dnn`. No guarda fotos.
- Si la confianza es menor de 0,70 avisa que el resultado es dudoso y conviene revisar a mano.

## Desarrollo
```
npm ci
python -m venv .venvapi && .venvapi/bin/pip install -r requirements.txt
.venvapi/bin/python scripts/servidor_local.py   # API en el puerto 8000
npm run dev                                     # web en el puerto 3000
```
Comprobar que la web responde igual que el entrenamiento:
`.venvapi/bin/python scripts/probar_paridad.py <carpeta PYTHON del proyecto de entrenamiento>`

## Límites conocidos
- La comprobación «no hay pepino» es débil: solo rechaza fotos sin nada verde o amarillo.
- El modelo se entrenó con fotos de un pepino sobre tierra; en otros fondos no está probado.
