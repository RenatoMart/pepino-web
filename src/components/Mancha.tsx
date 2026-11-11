/* eslint-disable max-len */
import type { SVGProps } from 'react';

/*
 * Mancha de jugo de pepino: un charco de borde irregular, con chorros finos que salen hacia `direccion`
 * (por donde voló el jugo) y terminan en una gota, y gotitas sueltas alrededor. Volumen con degradado y brillos.
 */

const r1 = (v: number) => Math.round(v * 10) / 10;
const azar = (semilla: number) => () => {
	semilla = (semilla + 0x6d2b79f5) | 0;
	let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type FormaMancha = ReturnType<typeof crearMancha>;

/** `direccion` en radianes (0 = derecha, π/2 = abajo). `chorros`: cuántos hilos gotean hacia abajo. */
export function crearMancha(semilla: number, direccion = 0, chorros = 0) {
	const a = azar(semilla);
	// charco: radio que ondula suave con el ángulo (tres ondas con fases al azar)
	const fases = [a() * 6.28, a() * 6.28, a() * 6.28];
	const n = 48;
	const pts = Array.from({ length: n }, (_, k) => {
		const ang = (k / n) * Math.PI * 2;
		const r =
			50 +
			7 * Math.sin(2 * ang + fases[0]) +
			5 * Math.sin(3 * ang + fases[1]) +
			3.5 * Math.sin(5 * ang + fases[2]) +
			6 * Math.max(0, Math.cos(ang - direccion));
		return `${r1(Math.cos(ang) * r)},${r1(Math.sin(ang) * r)}`;
	});
	const charco = `M${pts.join('L')}Z`;

	// chorros: salen del charco, se afinan y acaban en una gota; más largos hacia `direccion`
	const nDedos = 4 + Math.floor(a() * 3);
	const dedos = Array.from({ length: nDedos }, () => {
		// la mayoría sale hacia donde voló el jugo; alguno suelto hacia cualquier lado
		const ang = direccion + (a() - 0.5) * (a() > 0.25 ? 2.4 : 6.28);
		const favor = Math.max(0, Math.cos(ang - direccion));
		const largo = 58 + a() * 30 + favor * favor * (20 + a() * 55);
		const base = 12 + a() * 11;
		const cuello = 2.4 + a() * 2.6;
		const gota = cuello + 0.6 + a() * 2.6;
		const m = 34 + (largo - 34) * 0.45;
		return {
			g: Math.round((ang * 180) / Math.PI),
			d: `M34,${r1(-base)}Q${r1(m)},${r1(-cuello)} ${r1(largo)},${r1(-cuello)}L${r1(largo)},${r1(cuello)}Q${r1(m)},${r1(cuello)} 34,${r1(base)}Z`,
			largo: r1(largo),
			gota: r1(gota),
		};
	});

	// gotitas sueltas: la mayoría hacia `direccion`, más pequeñas cuanto más lejos
	const gotas = Array.from({ length: 12 }, () => {
		const ang = direccion + (a() - 0.5) * (a() > 0.3 ? 2 : 6.28);
		const dist = 98 + a() * 50;
		return {
			x: r1(Math.cos(ang) * dist),
			y: r1(Math.sin(ang) * dist),
			r: r1(1.6 + a() * 5.5 * (1 - (dist - 98) / 90)),
		};
	});
	const semillas = Array.from({ length: 3 }, () => ({
		x: r1((a() - 0.5) * 50),
		y: r1((a() - 0.25) * 44),
		g: Math.round(a() * 180),
	}));
	const hilos = Array.from({ length: chorros }, () => ({
		x: r1((a() - 0.5) * 50),
		ancho: r1(6 + a() * 5),
		largo: r1(85 + a() * 90),
	}));
	return { id: `mj${semilla}`, charco, dedos, gotas, semillas, hilos };
}

const SOMBRA = '#1d6b16';

type Props = {
	forma: FormaMancha;
	/** Si se indica, los hilos empiezan recogidos y llevan los datos que usa la animación de la portada. */
	esperaHilos?: number;
} & SVGProps<SVGSVGElement>;

export default function Mancha({ forma, esperaHilos, ...resto }: Props) {
	const animada = esperaHilos !== undefined;
	const relleno = `url(#${forma.id})`;
	// Todo el líquido (charco, chorros y gotas) se dibuja dos veces: una base más oscura que asoma como borde, y encima el color con volumen.
	const liquido = (
		<>
			{forma.dedos.map((d, j) => (
				<g key={j} transform={`rotate(${d.g})`}>
					<path d={d.d} />
					<circle cx={d.largo} r={d.gota} />
				</g>
			))}
			<path d={forma.charco} />
			{forma.gotas.map((g, j) => (
				<circle cx={g.x} cy={g.y} key={j} r={g.r} />
			))}
		</>
	);
	return (
		<svg
			aria-hidden='true'
			overflow='visible'
			viewBox='-150 -150 300 300'
			{...resto}
		>
			<defs>
				<radialGradient
					cx='-18'
					cy='-24'
					gradientUnits='userSpaceOnUse'
					id={forma.id}
					r='150'
				>
					<stop offset='0' stopColor='#86d13c' />
					<stop offset='0.3' stopColor='#4aa826' />
					<stop offset='0.7' stopColor='#2f8f1c' />
					<stop offset='1' stopColor='#226f17' />
				</radialGradient>
			</defs>
			{forma.hilos.map((h, j) => (
				<g
					data-espera={animada ? esperaHilos + j * 180 : undefined}
					data-r={animada ? 'chorro' : undefined}
					key={j}
					style={{
						transformBox: 'fill-box',
						transformOrigin: 'top',
						transform: animada ? 'scaleY(0)' : undefined,
					}}
				>
					<rect
						fill='#2f8f1c'
						height={h.largo}
						rx={h.ancho / 2}
						stroke={SOMBRA}
						strokeWidth='1.5'
						width={h.ancho}
						x={h.x - h.ancho / 2}
						y='14'
					/>
					<ellipse
						cx={h.x}
						cy={h.largo + 16}
						fill='#2f8f1c'
						rx={h.ancho * 0.8}
						ry={h.ancho * 1.1}
						stroke={SOMBRA}
						strokeWidth='1.5'
					/>
					<ellipse
						cx={h.x - h.ancho * 0.2}
						cy={h.largo + 13}
						fill='#fff'
						opacity='0.6'
						rx='1.2'
						ry='2.4'
					/>
				</g>
			))}
			<g fill={SOMBRA} stroke={SOMBRA} strokeLinejoin='round' strokeWidth='3.5'>
				{liquido}
			</g>
			<g fill={relleno}>{liquido}</g>
			{/* zona más clara y húmeda en el centro */}
			<path
				d={forma.charco}
				fill='#a5e052'
				opacity='0.28'
				transform='translate(-7 -9) scale(0.62)'
			/>
			{/* brillos */}
			<path
				d='M-34,-18Q-30,-38 -8,-41'
				fill='none'
				opacity='0.75'
				stroke='#fff'
				strokeLinecap='round'
				strokeWidth='4.5'
			/>
			<circle cx='2' cy='-40' fill='#fff' opacity='0.7' r='2.4' />
			{forma.dedos.map((d, j) => (
				<circle
					cx={d.largo - d.gota * 0.3}
					cy={-d.gota * 0.35}
					fill='#fff'
					key={j}
					opacity='0.6'
					r={Math.max(0.9, d.gota * 0.22)}
					transform={`rotate(${d.g})`}
				/>
			))}
			{forma.semillas.map((s, j) => (
				<ellipse
					cx={s.x}
					cy={s.y}
					fill='#eef6c6'
					key={j}
					opacity='0.9'
					rx='6'
					ry='2.8'
					stroke='#a9cc72'
					strokeWidth='1'
					transform={`rotate(${s.g} ${s.x} ${s.y})`}
				/>
			))}
		</svg>
	);
}
