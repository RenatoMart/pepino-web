/* eslint-disable @next/next/no-img-element */
export default function SinPepino({
	src,
	mensaje,
}: {
	src: string;
	mensaje: string;
}) {
	return (
		<div className='aparecer grid items-start gap-8 md:grid-cols-2'>
			<img
				alt='Foto enviada, en la que no se reconoce un pepino'
				className='foto-ficha max-h-[60vh] w-full object-contain'
				src={src}
			/>
			<div className='flex flex-col gap-5'>
				<div role='status'>
					<p className='font-display text-6xl leading-none sm:text-7xl'>
						Aquí no hay un pepino
					</p>
					<p className='mt-2 text-lg font-medium'>{mensaje}</p>
				</div>
				<div className='panel-suave'>
					<p className='font-semibold'>Para que funcione</p>
					<ul className='mt-2 list-disc pl-5'>
						<li>Fotografía un solo pepino, con luz de día.</li>
						<li>Acércate hasta que ocupe buena parte de la imagen.</li>
						<li>Ponlo sobre el suelo o una superficie sin otros objetos.</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
