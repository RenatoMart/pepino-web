/* eslint-disable max-len */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RespuestaAnalisis as TipoResultado } from '../lib/clases';
import { prepararImagen } from '../lib/imagen';
import Camara from './Camara';
import { PepinoDibujo } from './InicioPepino';
import Mancha, { crearMancha } from './Mancha';
import Resultado from './Resultado';
import SinPepino from './SinPepino';

type Estado =
	| { fase: 'inicio' }
	| { fase: 'preparando' | 'analizando'; vista: string }
	| { fase: 'listo'; vista: string; datos: TipoResultado }
	| { fase: 'error'; mensaje: string; vista?: string };

const M_BANDEJA = crearMancha(205, Math.PI * 0.3, 2);
const M_BANDEJA_2 = crearMancha(318, Math.PI * 1.2, 0);

const TEXTO = {
	preparando: 'Preparando la foto…',
	analizando: 'Mirando el pepino…',
} as const;

export default function Analizador() {
	const [estado, setEstado] = useState<Estado>({ fase: 'inicio' });
	const [arrastrando, setArrastrando] = useState(false);
	const [camaraAbierta, setCamaraAbierta] = useState(false);
	const galeria = useRef<HTMLInputElement>(null);
	const camara = useRef<HTMLInputElement>(null);
	const vistaActual = useRef<string | null>(null);
	const seccionResultado = useRef<HTMLElement>(null);

	useEffect(() => {
		return () => {
			if (vistaActual.current) URL.revokeObjectURL(vistaActual.current);
		};
	}, []);

	// En pantallas angostas el resultado queda debajo de la subida: al empezar el análisis
	// (y al terminar) se baja solo hasta la foto para verla sin tener que hacer scroll.
	const fase = estado.fase;
	const tieneVista = fase !== 'inicio' && !!estado.vista;
	useEffect(() => {
		const sec = seccionResultado.current;
		if (
			!sec ||
			(fase !== 'analizando' && fase !== 'listo' && fase !== 'error')
		) {
			return;
		}
		if (fase === 'analizando' && !tieneVista) return;
		const { top } = sec.getBoundingClientRect();
		if (top < window.innerHeight * 0.3) return; // ya está a la vista (pantalla ancha)
		const sinMovimiento = matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;
		sec.scrollIntoView({
			behavior: sinMovimiento ? 'auto' : 'smooth',
			block: 'start',
		});
	}, [fase, tieneVista]);

	const analizar = useCallback(async (archivo: File) => {
		if (vistaActual.current) URL.revokeObjectURL(vistaActual.current);
		let vista = '';
		try {
			setEstado({ fase: 'preparando', vista: '' });
			const blob = await prepararImagen(archivo);
			vista = URL.createObjectURL(blob);
			vistaActual.current = vista;
			setEstado({ fase: 'analizando', vista });
			const control = new AbortController();
			const limite = setTimeout(() => control.abort(), 90_000);
			const resp = await fetch('/api/analizar', {
				method: 'POST',
				headers: { 'Content-Type': 'image/jpeg' },
				body: blob,
				signal: control.signal,
			}).finally(() => clearTimeout(limite));
			let cuerpo: unknown = null;
			try {
				cuerpo = await resp.json();
			} catch {
				cuerpo = null;
			}
			if (!resp.ok || !cuerpo || (cuerpo as { error?: string }).error) {
				const msg =
					(cuerpo as { error?: string } | null)?.error ??
					(resp.status === 413
						? 'La imagen es demasiado grande.'
						: 'No se pudo analizar la imagen. Intenta de nuevo.');
				throw new Error(msg);
			}
			setEstado({ fase: 'listo', vista, datos: cuerpo as TipoResultado });
		} catch (e) {
			const abortado = e instanceof DOMException && e.name === 'AbortError';
			setEstado({
				fase: 'error',
				vista: vista || undefined,
				mensaje: abortado
					? 'El análisis tardó demasiado. Intenta con otra foto.'
					: e instanceof Error
						? e.message
						: 'Ocurrió un error inesperado.',
			});
		}
	}, []);

	const elegir = (lista: FileList | null) => {
		const f = lista?.[0];
		if (f) void analizar(f);
	};

	// Abre la cámara dentro de la página; si el navegador no puede (por ejemplo, sin HTTPS), usa el campo de archivo.
	const abrirCamara = () => {
		const puede =
			window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
		if (puede) setCamaraAbierta(true);
		else camara.current?.click();
	};

	const fallaCamara = useCallback((mensaje: string) => {
		setCamaraAbierta(false);
		setEstado({ fase: 'error', mensaje });
	}, []);
	const cerrarCamara = useCallback(() => setCamaraAbierta(false), []);
	const fotoDeCamara = useCallback(
		(archivo: File) => {
			setCamaraAbierta(false);
			void analizar(archivo);
		},
		[analizar],
	);

	const reiniciar = () => {
		if (vistaActual.current) URL.revokeObjectURL(vistaActual.current);
		vistaActual.current = null;
		setEstado({ fase: 'inicio' });
		if (galeria.current) galeria.current.value = '';
		if (camara.current) camara.current.value = '';
	};

	const ocupado = estado.fase === 'preparando' || estado.fase === 'analizando';

	return (
		<>
			{camaraAbierta && (
				<Camara
					onCerrar={cerrarCamara}
					onError={fallaCamara}
					onFoto={fotoDeCamara}
				/>
			)}
			<input
				accept='image/*'
				className='sr-only'
				id='archivo'
				onChange={e => elegir(e.target.files)}
				ref={galeria}
				type='file'
			/>
			<input
				accept='image/*'
				capture='environment'
				className='sr-only'
				id='camara'
				onChange={e => elegir(e.target.files)}
				ref={camara}
				type='file'
			/>

			{estado.fase === 'inicio' ? (
				<section
					aria-labelledby='t-foto'
					className={`bandeja aparecer ${arrastrando ? 'bandeja-activa' : ''}`}
					onDragLeave={() => setArrastrando(false)}
					onDragOver={e => {
						e.preventDefault();
						setArrastrando(true);
					}}
					onDrop={e => {
						e.preventDefault();
						setArrastrando(false);
						elegir(e.dataTransfer.files);
					}}
				>
					<div aria-hidden='true' className='bandeja-fondo'>
						<Mancha
							className='absolute -top-20 -left-20 w-72 sm:w-80'
							forma={M_BANDEJA}
						/>
						<Mancha
							className='absolute -right-24 -bottom-28 w-80 sm:w-96'
							forma={M_BANDEJA_2}
						/>
					</div>
					<div className='bandeja-zona'>
						<PepinoDibujo
							className='pepino-flota -mt-28 w-72 drop-shadow-[0_22px_16px_rgba(0,0,0,0.45)] sm:-mt-40 sm:w-[30rem]'
							conDefs={false}
						/>
						<h2 className='text-4xl text-balance sm:text-6xl' id='t-foto'>
							<span className='hidden [@media(pointer:fine)]:inline'>
								Suelta aquí la foto de un{' '}
								<span className='text-amarillo'>pepino</span>
							</span>
							<span className='[@media(pointer:fine)]:hidden'>
								Muéstranos un <span className='text-amarillo'>pepino</span>
							</span>
						</h2>
						<p className='text-lg text-white/80'>
							Súbela desde tu galería o tómala ahora con la cámara.
						</p>
						<div className='flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4'>
							<button
								className='pildora pildora-amarilla'
								onClick={() => galeria.current?.click()}
								type='button'
							>
								Subir foto
							</button>
							<button
								className='pildora pildora-linea'
								onClick={abrirCamara}
								type='button'
							>
								Tomar foto
							</button>
						</div>
					</div>
					<ul className='relative mt-6 flex flex-wrap justify-center gap-2 text-sm'>
						<li className='ficha-consejo'>Un solo pepino por foto</li>
						<li className='ficha-consejo'>Con luz de día</li>
						<li className='ficha-consejo'>
							Que ocupe buena parte de la imagen
						</li>
						<li className='ficha-consejo'>Sin otros objetos alrededor</li>
					</ul>
				</section>
			) : (
				<section
					aria-labelledby='t-res'
					className='ficha scroll-mt-4'
					ref={seccionResultado}
				>
					<h2 className='sr-only' id='t-res'>
						Resultado
					</h2>
					<div aria-live='polite'>
						{ocupado && (
							<div className='flex flex-col items-center gap-5 py-4 text-center'>
								<PepinoDibujo className='pepino-carga w-44' conDefs={false} />
								<p className='font-display text-4xl'>{TEXTO[estado.fase]}</p>
								{estado.vista && (
									<img
										alt='Foto que se está analizando'
										className='foto-ficha max-h-[50vh] w-auto max-w-full object-contain opacity-80'
										src={estado.vista}
									/>
								)}
							</div>
						)}
						{estado.fase === 'error' && (
							<p className='aviso-error' role='alert'>
								{estado.mensaje}
							</p>
						)}
						{estado.fase === 'listo' &&
							(estado.datos.pepino_detectado === false ? (
								<SinPepino mensaje={estado.datos.mensaje} src={estado.vista} />
							) : (
								<Resultado datos={estado.datos} src={estado.vista} />
							))}
					</div>
					{!ocupado && (
						<div className='mt-8 flex justify-center border-t-2 border-dashed border-(--pepino-claro) pt-6'>
							<button
								className='pildora pildora-verde'
								onClick={reiniciar}
								type='button'
							>
								{estado.fase === 'error'
									? 'Intentar de nuevo'
									: 'Analizar otra foto'}
							</button>
						</div>
					)}
				</section>
			)}
		</>
	);
}
