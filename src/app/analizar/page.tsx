/* eslint-disable max-len */
import type { Metadata } from 'next';
import Link from 'next/link';
import Analizador from '../../components/Analizador';
import { PepinoDibujo } from '../../components/InicioPepino';
import LogoMarca from '../../components/LogoMarca';
import Mancha, { crearMancha } from '../../components/Mancha';

export const metadata: Metadata = {
	title: 'Analizar un pepino · UPN',
};

// Manchas de la cabecera y del fondo: las mismas de la portada, quietas.
const M_IZQ = crearMancha(11, Math.PI * 0.75, 2);
const M_DER = crearMancha(48, -Math.PI * 0.2, 1);
const M_CHICA = crearMancha(77, Math.PI * 0.4, 0);

export default function Analizar() {
	return (
		<div className='relative min-h-dvh overflow-x-clip'>
			<header className='fondo-upn relative overflow-hidden'>
				<Mancha
					className='pointer-events-none absolute -top-28 right-[24%] hidden w-64 sm:block'
					forma={M_IZQ}
				/>
				<Mancha
					className='pointer-events-none absolute -right-10 -bottom-24 w-64 sm:-right-6 sm:w-96'
					forma={M_DER}
				/>
				<Mancha
					className='pointer-events-none absolute -bottom-8 left-[38%] hidden w-24 sm:block'
					forma={M_CHICA}
				/>

				<div className='relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-4 sm:px-10'>
					<Link aria-label='Volver al inicio' href='/'>
						<LogoMarca
							className='h-14 w-auto sm:h-16'
							tinta='#0F0F0F'
							variante='completa'
						/>
					</Link>
					<Link className='enlace-inicio' href='/'>
						Inicio
					</Link>
				</div>

				<div className='relative mx-auto grid w-full max-w-6xl items-center gap-2 px-6 pt-6 pb-8 sm:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] sm:px-10 sm:pt-8 sm:pb-10'>
					<div className='aparecer' style={{ animationDelay: '60ms' }}>
						<h1 className='text-6xl text-balance sm:text-8xl'>
							¿Maduro o{' '}
							<span className='bg-tinta text-amarillo box-decoration-clone px-3'>
								sobremaduro
							</span>
							?
						</h1>
						<p className='mt-4 max-w-md text-lg font-medium'>
							Sube la foto de un pepino y el modelo te dice en qué punto está.
						</p>
					</div>
					<PepinoDibujo className='aparecer mx-auto w-[min(78vw,26rem)] drop-shadow-[0_18px_14px_rgba(0,0,0,0.28)] sm:w-full' />
				</div>
			</header>

			<main className='zona-trabajo'>
				<div className='mx-auto w-full max-w-5xl px-4 pt-20 pb-16 sm:px-8 sm:pt-28 sm:pb-20'>
					<Analizador />
				</div>
			</main>
		</div>
	);
}
