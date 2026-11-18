import type { StyleToken } from '../dsl/types'

export interface Theme {
  token: StyleToken
  bg: string
  primary: string
  secondary: string
  accent: string
  text: string
  textSoft: string
  fontFamily: string
  lineWidth: number
  iconFilled: boolean
  glow: boolean
  subtitleBg: string
  subtitleText: string
  subtitleHighlight: string
}

const SANS = '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'

export const THEMES: Record<StyleToken, Theme> = {
  'hand-drawn': {
    token: 'hand-drawn',
    bg: '#F7F2E7',
    primary: '#3E3A33',
    secondary: '#8A7B66',
    accent: '#D1495B',
    text: '#3E3A33',
    textSoft: '#8A7B66',
    fontFamily: '"Chalkboard SE", "Comic Sans MS", "PingFang SC", cursive',
    lineWidth: 3,
    iconFilled: false,
    glow: false,
    subtitleBg: 'rgba(62, 58, 51, 0.85)',
    subtitleText: '#F7F2E7',
    subtitleHighlight: '#FFD166',
  },
  'flat-cartoon': {
    token: 'flat-cartoon',
    bg: '#FFF6EC',
    primary: '#FF8A65',
    secondary: '#4FC3F7',
    accent: '#7E57C2',
    text: '#37474F',
    textSoft: '#90A4AE',
    fontFamily: SANS,
    lineWidth: 4,
    iconFilled: true,
    glow: false,
    subtitleBg: 'rgba(55, 71, 79, 0.85)',
    subtitleText: '#FFFFFF',
    subtitleHighlight: '#FFD54F',
  },
  'tech-geometric': {
    token: 'tech-geometric',
    bg: '#0E1420',
    primary: '#4CC9F0',
    secondary: '#4361EE',
    accent: '#F72585',
    text: '#E8ECF3',
    textSoft: '#8A94A6',
    fontFamily: SANS,
    lineWidth: 2,
    iconFilled: false,
    glow: true,
    subtitleBg: 'rgba(232, 236, 243, 0.12)',
    subtitleText: '#E8ECF3',
    subtitleHighlight: '#4CC9F0',
  },
  'minimal-fresh': {
    token: 'minimal-fresh',
    bg: '#FAFAF7',
    primary: '#7C9A92',
    secondary: '#C9ADA7',
    accent: '#B5838D',
    text: '#2F3542',
    textSoft: '#A4B0AB',
    fontFamily: SANS,
    lineWidth: 2,
    iconFilled: false,
    glow: false,
    subtitleBg: 'rgba(47, 53, 66, 0.8)',
    subtitleText: '#FAFAF7',
    subtitleHighlight: '#C9ADA7',
  },
}

export function getTheme(token: StyleToken): Theme {
  return THEMES[token]
}
