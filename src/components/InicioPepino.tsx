'use client';
/* eslint-disable max-len */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import LogoMarca from './LogoMarca';
import Mancha, { crearMancha } from './Mancha';

/*
 * Portada: se repite sola y empieza de nuevo cada vez que se carga la página.
 *  1. Un pepino entra al centro.
 *  2. Tiembla cada vez más fuerte, se hincha y se agrieta.
 *  3. Revienta: los trozos salen volando, el jugo mancha la pantalla y el logo de la UPN sale de adentro.
 *  4. El logo se queda unos segundos, la escena se limpia y vuelve a empezar.
 * Las manchas verdes se quedan sobre el amarillo mientras está el logo. Todo se calcula en `cuadro(t)` a partir del tiempo transcurrido,
 * así que el estado final (sin animación) es el mismo cuadro con un tiempo grande.
 */

// ---------- tiempos (ms) ----------
const T_TIEMBLA = 650;
const T_APRIETA = 2050;
const T_BOOM = 2180;
const T_BOTON = T_BOOM + 850;
const T_FIN = T_BOOM + 3600;
const T_SALE = T_BOOM + 6200; // el logo se queda unos segundos y la escena se limpia
const T_VUELVE = T_SALE + 950; // y el pepino entra otra vez

// ---------- utilidades ----------
const limitar = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const tramo = (t: number, ini: number, dur: number) => limitar((t - ini) / dur);
const saleCubica = (p: number) => 1 - (1 - p) ** 3;
const saleExpo = (p: number) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
const saleRebote = (p: number, s = 1.7) =>
	1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;
/** Generador con semilla: la escena sale igual en el servidor y en el navegador. */
const azar = (semilla: number) => () => {
	semilla = (semilla + 0x6d2b79f5) | 0;
	let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r1 = (v: number) => Math.round(v * 10) / 10;

// ---------- geometría del pepino (unidades del SVG, acostado y centrado en 0,0) ----------
const LARGO = 390; // media longitud
const INCLINA = -14; // grados
const eje = (u: number) => 22 * u * u - 8; // leve curva
const grosor = (u: number) =>
	(92 + 14 * u) * Math.sqrt(Math.max(0, 1 - Math.abs(u) ** 4.5));

const CUERPO = (() => {
	const arriba: string[] = [];
	const abajo: string[] = [];
	for (let i = 0; i <= 60; i++) {
		const u = Math.sin((i / 60 - 0.5) * Math.PI);
		arriba.push(`${r1(u * LARGO)},${r1(eje(u) - grosor(u))}`);
		abajo.unshift(`${r1(u * LARGO)},${r1(eje(u) + grosor(u))}`);
	}
	return `M${arriba.join('L')}L${abajo.join('L')}Z`;
})();

const BULTOS = (() => {
	const a = azar(7);
	return Array.from({ length: 52 }, () => {
		const u = (a() * 2 - 1) * 0.9;
		const v = (a() * 2 - 1) * 0.8;
		return {
			x: r1(u * LARGO),
			y: r1(eje(u) + v * grosor(u)),
			r: r1((3.4 + a() * 3.2) * (1 - Math.abs(v) * 0.35)),
		};
	});
})();

const VETAS = [-0.56, -0.27, 0.04, 0.34, 0.6].map(v => {
	const pts: string[] = [];
	for (let i = 0; i <= 24; i++) {
		const u = -0.86 + (1.76 * i) / 24;
		pts.push(`${r1(u * LARGO)},${r1(eje(u) + v * grosor(u))}`);
	}
	return `M${pts.join('L')}`;
});

// Grietas: nacen en el centro y avanzan hacia los bordes, con ramas. Se dibujan de adentro hacia afuera.
const GRIETAS = (() => {
	const a = azar(41);
	const lista: { d: string; espera: number; ancho: number }[] = [];
	const n = 11;
	for (let i = 0; i < n; i++) {
		const ang = (i / n) * Math.PI * 2 + (a() - 0.5) * 0.35;
		const alcance = 0.7 + a() * 0.35;
		// el pepino es alargado: las grietas llegan más lejos a lo largo que a lo ancho
		const fx = Math.cos(ang) * 330 * alcance;
		const fy = Math.sin(ang) * 100 * alcance;
		const largo = Math.hypot(fx, fy);
		const [nx, ny] = [-fy / largo, fx / largo];
		const pts: number[][] = [[0, 0]];
		const pasos = 5;
		for (let j = 1; j <= pasos; j++) {
			const f = j / pasos;
			const desvio = j === pasos ? 0 : (a() - 0.5) * 26;
			pts.push([fx * f + nx * desvio, fy * f + ny * desvio]);
		}
		const espera = a() * 0.25;
		lista.push({
			d: `M${pts.map(q => `${r1(q[0])},${r1(q[1])}`).join('L')}`,
			espera,
			ancho: 4.5 + a() * 2,
		});
		// una rama que se abre a mitad de camino
		const k = 2 + Math.floor(a() * 2);
		const lado = a() > 0.5 ? 1 : -1;
		const ra = ang + lado * (0.5 + a() * 0.4);
		const rl = 34 + a() * 44;
		const medio = [
			pts[k][0] + Math.cos(ra) * rl * 0.5 + (a() - 0.5) * 10,
			pts[k][1] + Math.sin(ra) * rl * 0.35 + (a() - 0.5) * 10,
		];
		const fin = [
			pts[k][0] + Math.cos(ra) * rl,
			pts[k][1] + Math.sin(ra) * rl * 0.7,
		];
		lista.push({
			d: `M${r1(pts[k][0])},${r1(pts[k][1])}L${r1(medio[0])},${r1(medio[1])}L${r1(fin[0])},${r1(fin[1])}`,
			espera: espera + 0.3 + a() * 0.15,
			ancho: 2.5 + a() * 1.2,
		});
	}
	return lista;
})();

// Brecha: el hueco del centro por donde asoma la luz de lo que viene adentro.
const BRECHA = (() => {
	const a = azar(57);
	const n = 14;
	return Array.from({ length: n }, (_, i) => {
		const ang = (i / n) * Math.PI * 2;
		const r = i % 2 ? 0.42 + a() * 0.2 : 0.85 + a() * 0.3;
		return `${r1(Math.cos(ang) * 74 * r)},${r1(Math.sin(ang) * 40 * r)}`;
	}).join(' ');
})();

// Trozos: el pepino cortado en rodajas gruesas. Cada uno sale disparado con su velocidad y giro.
const CORTES = [-1, -0.58, -0.2, 0.18, 0.56, 1];
const rotar = (x: number, y: number) => {
	const g = (INCLINA * Math.PI) / 180;
	return [x * Math.cos(g) - y * Math.sin(g), x * Math.sin(g) + y * Math.cos(g)];
};
const TROZOS = (() => {
	const a = azar(21);
	return CORTES.slice(0, -1).map((u0, i) => {
		const u1 = CORTES[i + 1];
		const um = (u0 + u1) / 2;
		const x0 = i === 0 ? -600 : u0 * LARGO;
		const x1 = i === CORTES.length - 2 ? 600 : u1 * LARGO;
		const [cx, cy] = rotar(um * LARGO, eje(um));
		const dir = Math.atan2(cy - 60, cx) + (a() - 0.5) * 0.5;
		const fuerza = 620 + a() * 420;
		return {
			recorte: `${x0 - 9},-220 ${x1 - 9},-220 ${x1 + 9},220 ${x0 + 9},220`,
			cara: i < CORTES.length - 2 ? u1 : u0, // dónde se ve la pulpa
			origen: `${r1(((cx + 480) / 960) * 100)}% ${r1(((cy + 300) / 600) * 100)}%`,
			vx: Math.cos(dir) * fuerza,
			vy: Math.sin(dir) * fuerza - 420,
			giro: (a() - 0.5) * 900,
		};
	});
})();

const GOTAS = (() => {
	const a = azar(5);
	return Array.from({ length: 28 }, (_, i) => {
		const dir = (i / 28) * Math.PI * 2 + a() * 0.4;
		const fuerza = 420 + a() * 900;
		return {
			vx: Math.cos(dir) * fuerza,
			vy: Math.sin(dir) * fuerza - 260,
			tam: Math.round(6 + a() * 14),
			claro: a() > 0.6,
		};
	});
})();

// Manchas: dónde cae el jugo (en % de la pantalla) y de qué tamaño (en vmin). Evitan el centro, donde va el logo.
const RAYOS = (() => {
	const a = azar(9);
	return Array.from({ length: 18 }, (_, i) => ({
		ang: (i / 18) * 360 + a() * 14,
		largo: Math.round(70 + a() * 110),
		ancho: Math.round(4 + a() * 5),
		claro: i % 3 === 0,
		espera: a() * 70,
	}));
})();

// Astillas: pedacitos de cáscara y de pulpa que salen más rápido que los trozos grandes.
const ASTILLAS = (() => {
	const a = azar(33);
	const formas = [
		'polygon(0 30%, 55% 0, 100% 45%, 70% 100%, 15% 85%)',
		'polygon(10% 0, 100% 20%, 80% 100%, 0 70%)',
		'polygon(0 50%, 40% 0, 100% 30%, 60% 100%)',
	];
	return Array.from({ length: 16 }, (_, i) => {
		const dir = (i / 16) * Math.PI * 2 + a() * 0.5;
		const fuerza = 700 + a() * 900;
		return {
			vx: Math.cos(dir) * fuerza,
			vy: Math.sin(dir) * fuerza - 380,
			giro: (a() - 0.5) * 1600,
			tam: Math.round(14 + a() * 20),
			pulpa: i % 3 === 1,
			forma: formas[i % 3],
		};
	});
})();

// Manchas: dónde cae el jugo (en % de la pantalla) y de qué tamaño (en vmin). Evitan el centro, donde va el logo.
const MANCHAS = [
	{ x: 9, y: 15, t: 46, gotea: 2 },
	{ x: 89, y: 11, t: 36, gotea: 1 },
	{ x: 95, y: 61, t: 40, gotea: 2 },
	{ x: 4, y: 75, t: 38, gotea: 1 },
	{ x: 73, y: 93, t: 44, gotea: 0 },
	{ x: 27, y: 96, t: 30, gotea: 0 },
	{ x: 53, y: 2, t: 24, gotea: 1 },
	{ x: 17, y: 46, t: 13, gotea: 0 },
	{ x: 82, y: 35, t: 12, gotea: 0 },
].map((l, i) => ({
	...l,
	// el jugo sale del centro: los brazos de cada mancha apuntan hacia afuera
	forma: crearMancha(
		100 + i * 17,
		Math.atan2(l.y - 46, (l.x - 50) * 1.6),
		l.gotea,
	),
	espera: i * 24 + azar(i + 1)() * 40,
}));

/** El pepino completo, definido una vez y reutilizado (entero y en cada trozo). */
function Definiciones() {
	return (
		<svg
			aria-hidden='true'
			className='pointer-events-none absolute'
			height='0'
			width='0'
		>
			<defs>
				<linearGradient
					gradientUnits='userSpaceOnUse'
					id='pp-cuerpo'
					x1='0'
					x2='0'
					y1='-110'
					y2='112'
				>
					<stop offset='0' stopColor='#a4dc4f' />
					<stop offset='0.16' stopColor='#63b92d' />
					<stop offset='0.5' stopColor='#2f8f1c' />
					<stop offset='0.82' stopColor='#17601a' />
					<stop offset='1' stopColor='#0b3d12' />
				</linearGradient>
				<radialGradient
					cx='318'
					cy='-26'
					gradientUnits='userSpaceOnUse'
					id='pp-punta'
					r='210'
				>
					<stop offset='0' stopColor='#e4f271' stopOpacity='0.9' />
					<stop offset='0.45' stopColor='#b5e04e' stopOpacity='0.4' />
					<stop offset='1' stopColor='#b5e04e' stopOpacity='0' />
				</radialGradient>
				<radialGradient
					cx='-372'
					cy='14'
					gradientUnits='userSpaceOnUse'
					id='pp-cola'
					r='170'
				>
					<stop offset='0' stopColor='#072c0c' stopOpacity='0.7' />
					<stop offset='1' stopColor='#072c0c' stopOpacity='0' />
				</radialGradient>
				<radialGradient cx='0.36' cy='0.3' id='pp-bulto' r='0.75'>
					<stop offset='0' stopColor='#d2f08a' />
					<stop offset='0.45' stopColor='#58ad2a' />
					<stop offset='1' stopColor='#12501a' />
				</radialGradient>
				<radialGradient id='pp-pulpa'>
					<stop offset='0' stopColor='#f6fbd3' />
					<stop offset='0.7' stopColor='#dff0a6' />
					<stop offset='1' stopColor='#a9d466' />
				</radialGradient>
				<radialGradient cx='0.4' cy='0.35' id='pp-mancha' r='0.75'>
					<stop offset='0' stopColor='#5cb52c' />
					<stop offset='0.6' stopColor='#2f8f1c' />
					<stop offset='1' stopColor='#1b6615' />
				</radialGradient>
				<filter height='1.6' id='pp-suave' width='1.2' x='-0.1' y='-0.3'>
					<feGaussianBlur stdDeviation='3.2' />
				</filter>
				<filter height='3' id='pp-brillo' width='1.4' x='-0.2' y='-1'>
					<feGaussianBlur stdDeviation='9' />
				</filter>
				<filter id='pp-grano'>
					<feTurbulence
						baseFrequency='0.75'
						numOctaves='2'
						seed='4'
						type='fractalNoise'
					/>
					<feColorMatrix values='0 0 0 0 0  0 0 0 0 0.15  0 0 0 0 0  0 0 0 -1.5 0.95' />
				</filter>
				<clipPath id='pp-forma'>
					<path d={CUERPO} />
				</clipPath>
				{TROZOS.map((t, i) => (
					<clipPath id={`pp-corte-${i}`} key={i}>
						<polygon points={t.recorte} />
					</clipPath>
				))}
				<g id='pp-entero'>
					<path d={CUERPO} fill='url(#pp-cuerpo)' />
					<g clipPath='url(#pp-forma)'>
						<rect
							fill='url(#pp-punta)'
							height='400'
							width='900'
							x='-450'
							y='-200'
						/>
						<rect
							fill='url(#pp-cola)'
							height='400'
							width='900'
							x='-450'
							y='-200'
						/>
						<g
							fill='none'
							filter='url(#pp-suave)'
							opacity='0.2'
							stroke='#d3f08c'
							strokeLinecap='round'
							strokeWidth='7'
						>
							{VETAS.map((d, i) => (
								<path d={d} key={i} />
							))}
						</g>
						<rect
							filter='url(#pp-grano)'
							height='400'
							opacity='0.55'
							width='900'
							x='-450'
							y='-200'
						/>
						{BULTOS.map((b, i) => (
							<g key={i}>
								<circle
									cx={b.x + 1.2}
									cy={b.y + 1.8}
									fill='#0a3a10'
									opacity='0.45'
									r={b.r}
								/>
								<circle cx={b.x} cy={b.y} fill='url(#pp-bulto)' r={b.r} />
								<circle
									cx={b.x - b.r * 0.3}
									cy={b.y - b.r * 0.35}
									fill='#fff'
									opacity='0.55'
									r={b.r * 0.22}
								/>
							</g>
						))}
						<ellipse
							cx='30'
							cy='-62'
							fill='#fff'
							filter='url(#pp-brillo)'
							opacity='0.34'
							rx='290'
							ry='13'
						/>
						<path
							d={CUERPO}
							fill='none'
							opacity='0.5'
							stroke='#082e0d'
							strokeWidth='7'
						/>
					</g>
				</g>
			</defs>
		</svg>
	);
}

const VISTA = '-480 -300 960 600';

export default function InicioPepino() {
	const escena = useRef<HTMLElement>(null);
	const saltar = useRef<() => void>(() => {});
	const [hecho, setHecho] = useState(false);
	const [listo, setListo] = useState(false);

	useEffect(() => {
		const raiz = escena.current;
		if (!raiz) return;
		const uno = (r: string) =>
			raiz.querySelector<HTMLElement>(`[data-r="${r}"]`);
		const varios = (r: string) =>
			Array.from(raiz.querySelectorAll<HTMLElement>(`[data-r="${r}"]`));
		const caja = uno('caja');
		const pepino = uno('pepino');
		const sombra = uno('sombra');
		const logo = uno('logo');
		const destello = uno('destello');
		const temblor = uno('temblor');
		const grietas = varios('grieta');
		const trozos = varios('trozo');
		const gotas = varios('gota');
		const manchas = varios('mancha');
		const chorros = varios('chorro');
		const brillo = uno('brillo');
		const brecha = uno('brecha');
		const ondas = varios('onda');
		const rayos = varios('rayo');
		const astillas = varios('astilla');
		if (!caja || !pepino || !sombra || !logo || !destello || !temblor) return;

		let marcado = false;
		const terminar = () => {
			if (marcado) return;
			marcado = true;
			setHecho(true);
		};

		const cuadro = (t: number) => {
			const U = caja.clientWidth / 720; // escala de las distancias según el tamaño de la escena
			const antes = t < T_BOOM;
			const tb = (t - T_BOOM) / 1000; // segundos desde la explosión

			// --- el pepino: entra, tiembla, se hincha, se aprieta ---
			const entra = saleRebote(tramo(t, 0, 520), 1.4);
			const k = tramo(t, T_TIEMBLA, T_APRIETA - T_TIEMBLA);
			const fuerza = antes ? k * k : 0;
			const aprieta = saleCubica(tramo(t, T_APRIETA, T_BOOM - T_APRIETA));
			const dx = (Math.sin(t * 0.071) + Math.sin(t * 0.113)) * fuerza * 7 * U;
			const dy = (Math.sin(t * 0.093) + Math.cos(t * 0.127)) * fuerza * 4 * U;
			const giro = Math.sin(t * 0.089) * fuerza * 4.5;
			const hincha = 1 + 0.07 * k ** 3 + 0.03 * k * Math.sin(t * 0.021) ** 2; // late mientras se hincha
			const ex = (0.55 + 0.45 * entra) * hincha * (1 + 0.1 * aprieta);
			const ey = (0.55 + 0.45 * entra) * hincha * (1 - 0.13 * aprieta);
			pepino.style.opacity = antes ? String(tramo(t, 0, 160)) : '0';
			pepino.style.transform = `translate(${dx}px, ${dy + (1 - entra) * 46 * U}px) rotate(${giro}deg) scale(${ex}, ${ey})`;
			sombra.style.opacity = antes ? String(tramo(t, 80, 400) * 0.9) : '0';
			sombra.style.transform = `scaleX(${0.6 + 0.4 * entra + fuerza * 0.04})`;
			if (brillo) {
				brillo.style.opacity = antes
					? String(k * k * (0.75 + 0.25 * Math.sin(t * 0.03)))
					: '0';
				brillo.style.transform = `scale(${0.6 + 0.55 * k})`;
			}
			const grieta = tramo(k, 0.18, 0.78);
			if (brecha) {
				const abre = saleCubica(tramo(k, 0.4, 0.6));
				brecha.style.opacity = antes ? String(abre) : '0';
				brecha.style.transform = `scale(${abre * (1 + 0.14 * Math.sin(t * 0.03) ** 2)})`;
			}
			grietas.forEach((g, i) => {
				const p = limitar((grieta - GRIETAS[i].espera) / 0.4);
				g.style.strokeDashoffset = String(1 - p);
				g.style.opacity = antes && p > 0 ? '1' : '0';
			});

			// --- la explosión ---
			const frena = (1 - Math.exp(-2.4 * Math.max(0, tb))) / 2.4;
			trozos.forEach((el, i) => {
				const z = TROZOS[i];
				if (antes) {
					el.style.opacity = '0';
					return;
				}
				const x = z.vx * frena * U;
				const y = (z.vy * frena + 1100 * tb * tb) * U;
				el.style.opacity = tb > 1.6 ? '0' : '1';
				el.style.transform = `translate(${x}px, ${y}px) rotate(${z.giro * frena * 2.4}deg)`;
			});
			gotas.forEach((el, i) => {
				const z = GOTAS[i];
				if (antes) {
					el.style.opacity = '0';
					return;
				}
				const x = z.vx * frena * U;
				const y = (z.vy * frena + 900 * tb * tb) * U;
				const vx = z.vx * Math.exp(-2.4 * tb);
				const vy = z.vy * Math.exp(-2.4 * tb) + 1800 * tb;
				const estira = 1 + Math.min(1.6, Math.hypot(vx, vy) / 520);
				el.style.opacity = String(limitar(1.5 - tb * 1.4));
				el.style.transform = `translate(${x}px, ${y}px) rotate(${Math.atan2(vy, vx)}rad) scale(${estira}, ${limitar(1.1 - tb * 0.5, 0.3, 1.1)})`;
			});
			astillas.forEach((el, i) => {
				const z = ASTILLAS[i];
				if (antes) {
					el.style.opacity = '0';
					return;
				}
				el.style.opacity = String(limitar(2 - tb * 1.5));
				el.style.transform = `translate(${z.vx * frena * U}px, ${(z.vy * frena + 1000 * tb * tb) * U}px) rotate(${z.giro * frena}deg)`;
			});
			ondas.forEach((el, i) => {
				const p = antes ? 0 : tramo(tb * 1000, i * 110, 620);
				el.style.opacity = p > 0 ? String((1 - p) ** 2 * 0.8) : '0';
				el.style.transform = `scale(${(0.3 + 9 * saleExpo(p)) * U})`;
			});
			rayos.forEach((el, i) => {
				const z = RAYOS[i];
				const p = antes ? 0 : tramo(tb * 1000, z.espera, 430);
				el.style.opacity = p > 0 ? String(1 - p) : '0';
				el.style.transform = `rotate(${z.ang}deg) translateX(${(50 + 430 * saleExpo(p)) * U}px) scaleX(${(1.7 - 1.5 * p) * U})`;
			});
			destello.style.opacity = antes
				? '0'
				: String(limitar(1 - tb / 0.3) ** 2 * 0.92);
			const sacude = antes ? 0 : Math.exp(-tb * 7) * 16 * U;
			temblor.style.transform =
				sacude > 0.2
					? `translate(${Math.sin(t * 0.09) * sacude}px, ${Math.cos(t * 0.12) * sacude}px)`
					: '';

			// --- las manchas se estampan y gotean ---
			const sale = saleCubica(tramo(t, T_SALE, 700));
			manchas.forEach((el, i) => {
				const p = antes ? 0 : tramo(tb * 1000, MANCHAS[i].espera, 420);
				el.style.opacity = p > 0 ? String(1 - sale) : '0';
				el.style.transform = `translate(-50%, -50%) scale(${p > 0 ? saleRebote(saleExpo(p), 1.1) * (1 - 0.25 * sale) : 0})`;
			});
			chorros.forEach(el => {
				const espera = Number(el.dataset.espera);
				const p = antes ? 0 : saleCubica(tramo(tb * 1000, espera + 260, 2800));
				el.style.transform = `scaleY(${p})`;
			});

			// --- el logo sale de adentro ---
			const pl = antes ? 0 : tramo(tb * 1000, 30, 640);
			logo.style.opacity = String(limitar(pl * 5) * (1 - sale));
			logo.style.transform = `scale(${0.1 + 0.9 * saleRebote(pl, 1.9)}) rotate(${(1 - saleCubica(pl)) * -9}deg) scale(${1 - 0.45 * sale})`;

			if (t >= T_BOTON) terminar();
		};

		const params = new URLSearchParams(location.search);
		const fijo = params.get('cuadro'); // ?cuadro=1800 congela la animación en ese milisegundo (para revisar)
		const sinMovimiento = matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;

		let id = 0;
		let inicio = 0;
		const paso = (ahora: number) => {
			if (!inicio) inicio = ahora;
			let t = ahora - inicio;
			if (t >= T_VUELVE) {
				inicio = ahora; // vuelve a empezar
				t = 0;
			}
			cuadro(t);
			id = requestAnimationFrame(paso);
		};
		// saltar: pasa directo al logo ya puesto y el ciclo sigue desde ahí
		saltar.current = () => {
			inicio = performance.now() - T_BOTON;
			terminar();
		};

		if (fijo !== null) cuadro(Number(fijo));
		else if (sinMovimiento) {
			cuadro(T_FIN); // sin animación: el logo con las manchas, quieto
			terminar();
		} else {
			cuadro(0);
			id = requestAnimationFrame(paso);
		}
		setListo(true);
		const alCambiarTamano = () => {
			if (sinMovimiento) cuadro(T_FIN);
		};
		addEventListener('resize', alCambiarTamano);
		return () => {
			cancelAnimationFrame(id);
			removeEventListener('resize', alCambiarTamano);
		};
	}, []);

	useEffect(() => {
		const tecla = (e: KeyboardEvent) => {
			if (!hecho && (e.key === 'Escape' || e.key === ' ')) saltar.current();
		};
		addEventListener('keydown', tecla);
		return () => removeEventListener('keydown', tecla);
	}, [hecho]);

	return (
		<main
			className='fondo-upn relative min-h-dvh overflow-hidden'
			onClick={() => !hecho && saltar.current()}
			ref={escena}
			style={{ visibility: listo ? 'visible' : 'hidden' }}
		>
			<Definiciones />

			{/* manchas de jugo: se quedan sobre el amarillo */}
			<div aria-hidden='true' className='pointer-events-none absolute inset-0'>
				{MANCHAS.map((m, i) => (
					<Mancha
						className='absolute will-change-transform'
						data-r='mancha'
						esperaHilos={m.espera}
						forma={m.forma}
						key={i}
						style={{
							left: `${m.x}%`,
							top: `${m.y}%`,
							width: `${m.t}vmin`,
							height: `${m.t}vmin`,
							opacity: 0,
						}}
					/>
				))}
			</div>

			<div
				className='relative flex min-h-dvh flex-col items-center justify-center px-4 py-8'
				data-r='temblor'
			>
				<div
					className='relative aspect-960/600 w-[min(96vw,900px,118dvh)]'
					data-r='caja'
				>
					<div
						aria-hidden='true'
						className='absolute top-[78%] left-[12%] h-[9%] w-[76%] rounded-[50%] bg-black/25 blur-md'
						data-r='sombra'
						style={{ opacity: 0 }}
					/>

					<div
						aria-hidden='true'
						className='absolute -inset-[12%] will-change-transform'
						data-r='brillo'
						style={{
							opacity: 0,
							background:
								'radial-gradient(closest-side, rgba(244,255,170,0.95) 0%, rgba(200,240,106,0.55) 45%, rgba(200,240,106,0) 100%)',
						}}
					/>
					<div
						aria-hidden='true'
						className='absolute inset-0 will-change-transform'
						data-r='pepino'
						style={{ opacity: 0 }}
					>
						<svg className='size-full overflow-visible' viewBox={VISTA}>
							<g transform={`rotate(${INCLINA})`}>
								<use href='#pp-entero' />
								<g
									clipPath='url(#pp-forma)'
									fill='none'
									stroke='#f8ffc4'
									strokeLinejoin='round'
									strokeWidth='6'
									style={{ filter: 'drop-shadow(0 0 7px #f4ff9a)' }}
								>
									{GRIETAS.map((g, i) => (
										<path
											d={g.d}
											data-r='grieta'
											key={i}
											pathLength='1'
											strokeDasharray='1'
											strokeLinecap='round'
											strokeWidth={g.ancho}
											style={{ strokeDashoffset: 1, opacity: 0 }}
										/>
									))}
									<polygon
										data-r='brecha'
										fill='#fffde3'
										points={BRECHA}
										stroke='#fff7a8'
										strokeWidth='3'
										style={{
											opacity: 0,
											transformBox: 'fill-box',
											transformOrigin: 'center',
											filter: 'drop-shadow(0 0 12px #fff27a)',
										}}
									/>
								</g>
							</g>
						</svg>
					</div>

					{TROZOS.map((z, i) => (
						<div
							aria-hidden='true'
							className='absolute inset-0 will-change-transform'
							data-r='trozo'
							key={i}
							style={{ opacity: 0, transformOrigin: z.origen }}
						>
							<svg className='size-full overflow-visible' viewBox={VISTA}>
								<g transform={`rotate(${INCLINA})`}>
									<g clipPath={`url(#pp-corte-${i})`}>
										<use href='#pp-entero' />
									</g>
									<g
										transform={`translate(${r1(z.cara * LARGO)} ${r1(eje(z.cara))}) rotate(3)`}
									>
										<ellipse
											fill='url(#pp-pulpa)'
											rx='22'
											ry={r1(grosor(z.cara) - 3)}
											stroke='#2c7d19'
											strokeWidth='6'
										/>
										{[-0.5, -0.17, 0.17, 0.5].map(v => (
											<ellipse
												cy={r1(v * grosor(z.cara))}
												fill='#fbfde6'
												key={v}
												rx='5'
												ry='9'
												stroke='#bcd98a'
												strokeWidth='1.5'
											/>
										))}
									</g>
								</g>
							</svg>
						</div>
					))}

					<div
						aria-hidden='true'
						className='pointer-events-none absolute top-1/2 left-1/2 size-0'
					>
						{GOTAS.map((g, i) => (
							<span
								className='absolute rounded-full will-change-transform'
								data-r='gota'
								key={i}
								style={{
									width: g.tam,
									height: g.tam,
									marginLeft: -g.tam / 2,
									marginTop: -g.tam / 2,
									background: g.claro ? '#8fd13a' : '#2f8f1c',
									opacity: 0,
								}}
							/>
						))}
					</div>

					<div
						aria-hidden='true'
						className='pointer-events-none absolute top-1/2 left-1/2 size-0'
					>
						{[0, 1].map(i => (
							<span
								className='absolute rounded-full will-change-transform'
								data-r='onda'
								key={i}
								style={{
									width: 100,
									height: 100,
									left: -50,
									top: -50,
									border: `${i ? 6 : 4}px solid ${i ? '#8fd13a' : '#ffffff'}`,
									opacity: 0,
								}}
							/>
						))}
						{RAYOS.map((r, i) => (
							<span
								className='absolute rounded-full will-change-transform'
								data-r='rayo'
								key={i}
								style={{
									width: r.largo,
									height: r.ancho,
									top: -r.ancho / 2,
									left: 0,
									transformOrigin: 'left center',
									background: r.claro ? '#ffffff' : '#c8f06a',
									opacity: 0,
								}}
							/>
						))}
						{ASTILLAS.map((z, i) => (
							<span
								className='absolute will-change-transform'
								data-r='astilla'
								key={i}
								style={{
									width: z.tam * 1.5,
									height: z.tam,
									marginLeft: -z.tam * 0.75,
									marginTop: -z.tam / 2,
									clipPath: z.forma,
									background: z.pulpa
										? 'linear-gradient(160deg, #f6fbd3, #cfe98a)'
										: 'linear-gradient(160deg, #63b92d, #14561a)',
									opacity: 0,
								}}
							/>
						))}
					</div>
					<div
						className='absolute inset-0 grid place-items-center will-change-transform'
						data-r='logo'
						style={{ opacity: 0 }}
					>
						<LogoMarca
							className='h-auto w-[86%]'
							tinta='#0F0F0F'
							variante='completa'
						/>
					</div>
				</div>

				<div
					aria-hidden={!hecho}
					className={`relative mt-4 flex flex-col items-center gap-4 transition-[opacity,translate] duration-500 ease-out ${
						hecho
							? 'translate-y-0 opacity-100'
							: 'pointer-events-none translate-y-3 opacity-0'
					}`}
				>
					<Link
						className='boton-iniciar'
						href='/analizar'
						tabIndex={hecho ? 0 : -1}
					>
						Iniciar
						<svg
							aria-hidden='true'
							className='size-5'
							fill='none'
							stroke='currentColor'
							strokeLinecap='square'
							strokeWidth='3'
							viewBox='0 0 24 24'
						>
							<path d='M4 12h15M13 5l7 7-7 7' />
						</svg>
					</Link>
					<p className='text-center text-sm font-semibold tracking-wide text-black/70'>
						Madurez del pepino · Visión artificial con YOLO11
					</p>
				</div>
			</div>

			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0'
				data-r='destello'
				style={{
					opacity: 0,
					background:
						'radial-gradient(circle at 50% 46%, #ffffff 0%, #e9ffb0 26%, rgba(143,209,58,0.55) 52%, rgba(143,209,58,0) 76%)',
				}}
			/>
		</main>
	);
}

/** El pepino quieto, para usarlo como ilustración en otras páginas. */
export function PepinoDibujo({
	className,
	conDefs = true,
}: {
	className?: string;
	/** Ponlo en false si en la misma página ya hay otro pepino con las definiciones. */
	conDefs?: boolean;
}) {
	return (
		<>
			{conDefs && <Definiciones />}
			<svg aria-hidden='true' className={className} viewBox={VISTA}>
				<g transform={`rotate(${INCLINA})`}>
					<use href='#pp-entero' />
				</g>
			</svg>
		</>
	);
}
