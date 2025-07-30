import './index.css';
import {clock} from '../shared/clock';

const id = 'app';
const {clockHtml, clockInit} = clock();
const el = document.getElementById(id);

if (el) {
	el.innerHTML = clockHtml;
	clockInit();
}
