import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadLora} from '@remotion/google-fonts/Lora';

export const inter = loadInter('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']});
export const lora = loadLora('normal', {weights: ['500', '600', '700'], subsets: ['latin']});
export const loraItalic = loadLora('italic', {weights: ['500', '600'], subsets: ['latin']});
export const SANS = `${inter.fontFamily}, system-ui, sans-serif`;
export const SERIF = `${lora.fontFamily}, Georgia, serif`;
