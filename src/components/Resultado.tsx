/* eslint-disable max-len */
/* eslint-disable @next/next/no-img-element */
'use client';

import { VEREDICTO, type ResultadoAnalisis } from '../lib/clases';

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** Medidor de media luna: la aguja va de «maduro» (izquierda) a «sobremaduro» (derecha). */
function Medidor({ sobre }: { sobre: number }) {
	const ang = Math.PI * (1 - sobre);
	const x = 100 + 66 * Math.cos(ang);
	const y = 100 - 66 * Math.sin(ang);
	return (
		<svg
			aria-label={`Probabilidad de sobremaduro: ${pct(sobre)}`}
			className='w-full max-w-xs'
			role='img'
			viewBox='0 0 200 118'
		>
			<defs>
				<linearGradient id='medidor-color' x1='0' x2='1' y1='0' y2='0'>
					<stop offset='0' stopColor='#2f8f1c' />
					<stop offset='0.55' stopColor='#b9d436' />
					<stop offset='1' stopColor='#fbc105' />
				</linearGradient>
			</defs>
			<path
				d='M16 100 A84 84 0 0 1 184 100'
				fill='none'
				stroke='url(#medidor-color)'
				strokeLinecap='round'
				strokeWidth='20'
			/>
			<line
				stroke='#0f0f0f'
				strokeLinecap='round'
				strokeWidth='5'
				x1='100'
				x2={x}
				y1='100'
				y2={y}
			/>
			<circle cx='100' cy='100' fill='#0f0f0f' r='9' />
			<circle cx='100' cy='100' fill='#fbc105' r='3.5' />
		</svg>
	);
}

export default function Resultado({
	src,
	datos,
}: {
	src: string;
	datos: ResultadoAnalisis;
}) {
	const v = VEREDICTO[datos.categoria];
	const maduro = datos.categoria === 'Maduro';

	return (
		<div className='aparecer grid items-start gap-8 md:grid-cols-2'>
			<img
				alt='Foto analizada'
				className='foto-ficha max-h-[70vh] w-full object-contain'
				src={src}
			/>

			<div className='flex flex-col gap-6'>
				<div role='status'>
					<p className='text-suave text-sm font-semibold tracking-widest uppercase'>
						Este pepino está
					</p>
					<p
						className={`font-display text-7xl leading-none sm:text-8xl ${
							maduro ? 'text-pepino' : 'text-(--sobre)'
						}`}
					>
						{v.titulo}
					</p>
					<p className='mt-2 text-lg font-medium'>{v.detalle}</p>
				</div>

				{datos.dudoso && (
					<p className='aviso-duda'>
						El modelo no está seguro (confianza de {pct(datos.confianza)}, menor
						de {pct(datos.umbral_duda)}). Revisa este pepino a mano.
					</p>
				)}

				<div className='panel-suave flex flex-col items-center gap-1'>
					<Medidor sobre={datos.p_sobremaduro} />
					<div className='flex w-full max-w-xs justify-between text-sm font-semibold'>
						<span>Maduro</span>
						<span>Sobremaduro</span>
					</div>
					<p className='mt-2 text-center'>
						El modelo está{' '}
						<strong className='font-display text-3xl tabular-nums'>
							{pct(datos.confianza)}
						</strong>{' '}
						seguro.
					</p>
				</div>

				<dl className='grid grid-cols-2 gap-3'>
					<div className='panel-suave'>
						<dt className='text-suave text-sm'>Amarillo en el fruto</dt>
						<dd className='font-display text-4xl tabular-nums'>
							{datos.amarillo_pct} %
						</dd>
					</div>
					<div className='panel-suave'>
						<dt className='text-suave text-sm'>El pepino ocupa</dt>
						<dd className='font-display text-4xl tabular-nums'>
							{datos.pepino_pct_imagen} %
						</dd>
					</div>
				</dl>
				{datos.pepino_pct_imagen < 4 && (
					<p className='aviso-duda'>
						El pepino ocupa muy poco de la foto; acércate para un resultado más
						fiable.
					</p>
				)}

				<p className='text-suave text-xs'>
					Apoyo a la selección: es un resultado automático y preliminar. En la
					prueba el modelo acertó 94,5 % de 272 fotos. La decisión final es de
					la persona.
				</p>
			</div>
		</div>
	);
}
