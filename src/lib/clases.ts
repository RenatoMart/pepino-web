export type Categoria = 'Maduro' | 'Sobremaduro';

export type ResultadoAnalisis = {
	pepino_detectado: true;
	categoria: Categoria;
	/** Probabilidad que el modelo da a la categoría elegida (0 a 1). */
	confianza: number;
	p_sobremaduro: number;
	/** La confianza quedó por debajo del umbral: conviene revisar a mano. */
	dudoso: boolean;
	umbral_duda: number;
	/** Parte amarilla del color vivo de la foto, en porcentaje. */
	amarillo_pct: number;
	pepino_pct_imagen: number;
};

/** Respuesta cuando en la foto no se reconoce un pepino. */
export type SinPepino = { pepino_detectado: false; mensaje: string };

export type RespuestaAnalisis = ResultadoAnalisis | SinPepino;

export const VEREDICTO: Record<
	Categoria,
	{ titulo: string; detalle: string; tono: 'ok' | 'no' }
> = {
	Maduro: {
		titulo: 'Maduro',
		detalle: 'Cáscara verde y pareja: está en su punto para la venta.',
		tono: 'ok',
	},
	Sobremaduro: {
		titulo: 'Sobremaduro',
		detalle: 'Se ve amarilleo en la cáscara: ya pasó su punto.',
		tono: 'no',
	},
};
