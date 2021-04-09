/**
 * 	Interactive $Tezos #OBJKT #NFT by @neelts built for @hicetnunc
 * 	How to draw:
 * 		- Send 0.00XXYY to $account to set next point (XX & YY - int 01-99)
 * 		- Send 0.010000 to clear current drawings
 *
 */

const SVG = "http://www.w3.org/2000/svg";

const api = 'https://api.tzkt.io/v1/';
const account = 'tz1hadV1B3jiey6xiUVgfdSPKwSdaMEUMmd9';

const speed = 1;

type Operation = {
	id: number;
	hash: string;
	amount: number;
}

const transactions = (resolve: (data: Operation[]) => void, reject?, limit = 100, lastId?: number) => {
	const r = new XMLHttpRequest();
	r.open('get', `${api}accounts/${account}/operations?type=transaction&limit=${limit}${
		lastId ? '&lastId=' + lastId : ''
	}&target=${account}`);
	r.setRequestHeader('Cache-Control', 'no-cache');
	r.onload = _ => resolve(JSON.parse(r.responseText));
	r.onerror = reject;
	r.ontimeout = reject;
	r.onabort = reject;
	r.send();
};

const get = (id): SVGElement | unknown => {
	return document.getElementById(id);
};
const tag = (node, name) => node.getElementsByTagName(name)[0];
const base = (v) => v.baseVal.value;
const create = (name) => document.createElementNS(SVG, name);
const intAttribute = (node, name) => parseInt(node.getAttribute(name));
const setAttributes = (node, attr) => attr.forEach(
	([name, value]) => node.setAttribute(name, value)
);
const xy = (node, x, y) => node.setAttribute('transform', `translate(${x}, ${y})`);
const clamp = (value) => value < 0 ? 0 : (value > 1 ? 1 : value);

const root = document.firstChild as SVGSVGElement;
root.style.width = root.style.height = '100%';

const etch = get('etch') as SVGElement;
const device = get('device') as SVGElement;
const holder = create('g');
const back = tag(device, 'rect') as SVGRectElement;

const bx = base(back.x);
const by = base(back.y);
const hx = bx + base(back.width) * .5;
const hy = by + base(back.height) * .5;

xy(holder, hx, hy);
xy(device, -hx, -hy);
holder.appendChild(device);
etch.appendChild(holder);

const canvas = get('canvas') as SVGGElement;
const bounds = tag(canvas, 'rect');
const cs = intAttribute(bounds, 'stroke-width') * .5;
const sc = Math.round((bounds.width.baseVal.value - cs) * .01);
const shakePower = 4;
const shakePoints = 10;
const shakeDuration = 0.3;

const shake = (handler?) => {
	const animate = create('animateMotion') as SVGAnimateMotionElement;
	const shakeFrames = [];
	const total = (Math.random() * shakePoints) + shakePoints;
	for (let i = 0; i < total; i++) shakeFrames.push([
		Math.round(Math.random() * shakePower) - shakePower * .5,
		Math.round(Math.random() * shakePower) - shakePower * .5
	]);

	const sd = shakeDuration / speed;

	setAttributes(animate, [
		['dur', `${sd}s`],
		['repeatCount', 'indefinite'],
		['path', `M 0,0${shakeFrames.map(([x, y]) =>
			`L ${x * 2},${y * 2}`).join('')}M 0,0`]
	]);
	holder.appendChild(animate);
	setTimeout(() => {
		holder.removeChild(animate);
		if (handler) setTimeout(handler, 500 / speed);
	}, sd * 1000);
};

enum ActionType {
	Draw,
	Shake,
	Restart,
}

const limit = 100;

type Point = [x: number, y: number];

type Action = {
	type: ActionType;
	points?: Point[];
}

let executing = false;
let actions: Action[] = [];
let segments: SVGPolylineElement[] = [];

const ShakeAmount = 10000;

function fillActions(data?: Operation[]) {

	if (data?.length > 0) {
		let action: Action = null;
		for (const op of data) {
			const x = Math.floor(op.amount * .01);
			const y = op.amount - x * 100;
			if (x > 0 && x < 100 && y > 0 && y < 100) {
				if (!action) {
					action = {type: ActionType.Draw, points: []};
					actions.push(action);
				}
				action.points.push([x, y]);
			} else if (op.amount == ShakeAmount && actions.length > 0) {
				actions.push({type: ActionType.Shake});
				action = null;
			}
		}

		const last = data[data.length - 1];
		transactions(fillActions, (e) => {
			console.log(e);
			fillActions();
		}, limit, last.id);

	} else {
		actions.push({type: ActionType.Restart});
	}

	executeAction();
}

function shakeAndReset(delay: number, handler?) {
	setTimeout(() => {
		if (segments.length > 0) {
			segments.forEach((polyline) => {
				canvas.removeChild(polyline);
			});
			segments = [];
		}
		shake(handler);
	}, delay);
}

function completeAction() {
	executing = false;
	executeAction();
}

function executeAction() {
	if (actions.length > 0) {
		if (!executing) {
			executing = true;
			const action = actions.shift();
			switch (action.type) {
				case ActionType.Draw: {
					draw(action.points);
					break;
				}
				case ActionType.Shake: {
					shakeAndReset(500 / speed, completeAction);
					break;
				}
				case ActionType.Restart: {
					shakeAndReset(10000 / speed, () => {
						completeAction();
						setTimeout(getTransactions, 500 / speed);
					});
					break;
				}
			}
		}
	}
}

const leftKnob = get('leftKnobCircle') as SVGCircleElement;
const rightKnob = get('rightKnobCircle') as SVGCircleElement;
const lx = base(leftKnob.cx);
const ly = base(leftKnob.cy);
const rx = base(rightKnob.cx);
const ry = base(rightKnob.cy);

function draw(points: Point[]) {

	const ds = [];

	if (points.length <= 1) {
		completeAction();
		return;
	}

	let length = 0;
	points.forEach((([x, y], index) => {
		if (index > 0) {
			const [px, py] = points[index - 1];
			const dx = x - px;
			const dy = y - py;
			const d = Math.sqrt(dx * dx + dy * dy) * sc;
			length += d;
			ds.push(d);
		}
	}));

	const polyline = create('polyline') as SVGPolylineElement;
	setAttributes(polyline, [
		['transform', `translate(${base(bounds.x) + cs}, ${base(bounds.y) + cs})`],
		['stroke', 'white'],
		['stroke-width', '2'],
		['stroke-linecap', 'round'],
		['stroke-linejoin', 'round'],
		['points', points.map(([x, y]) => `${x * sc},${y * sc}`).join(' ')]
	]);
	setAttributes(polyline, [
		['stroke-dasharray', length],
		['stroke-dashoffset', length],
	]);

	let start = null;
	let last = null;
	let index = 0;

	function rotate(knob, kx, ky, r) {
		(knob.parentNode as SVGGElement).setAttribute(
			'transform',
			`rotate(${r} ${kx} ${ky})`
		);
	}

	function nextFrame(time) {

		time *= speed;

		if (!last) start = last = time;

		const d = ds[index];
		const dt = time - last;
		const [px, py] = points[index];
		const [cx, cy] = points[index + 1];
		const cd = clamp(dt / d);
		const R = 3.6;

		rotate(leftKnob, lx, ly, (px - (px - cx) * cd) * R);
		rotate(rightKnob, rx, ry, (py - (py - cy) * cd) * R);

		polyline.setAttribute(
			'stroke-dashoffset',
			`${length - Math.min(time - start, length)}`
		);

		if (dt > d) {
			last = time;
			index++;
		}

		if (index < ds.length) {
			window.requestAnimationFrame(nextFrame);
		} else {
			completeAction();
		}
	}

	window.requestAnimationFrame(nextFrame);

	canvas.appendChild(polyline);
	segments.push(polyline);
}

function getTransactions() {
	transactions(fillActions, (e) => {
		console.log(e);
		console.log('Retrying in 30 seconds...');
		setTimeout(getTransactions, 30000);
	}, limit);
}

getTransactions();