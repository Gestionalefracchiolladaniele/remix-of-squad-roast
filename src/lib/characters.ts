import avatarZamp from '@/assets/avatar-zamp.jpg';
import avatarFashionblo from '@/assets/avatar-fashionblo.jpg';
import avatarBkkin from '@/assets/avatar-bkkin.jpg';
import avatarGmmon from '@/assets/avatar-gmmon.jpg';
import avatarCularott from '@/assets/avatar-cularott.jpg';
import avatarUpappon from '@/assets/avatar-upappon.jpg';
import avatarCrnut from '@/assets/avatar-crnut.jpg';
import avatarGhigghion from '@/assets/avatar-ghigghion.jpg';
import avatarSquagghiat from '@/assets/avatar-squagghiat.jpg';
import avatarRkknid from '@/assets/avatar-rkknid.jpg';

export type GroupType = 'female' | 'male' | 'vip';
export type RoastLevel = 'soft' | 'medium' | 'savage';
export type ChatMode = 'group' | 'single';

export interface CharacterMessage {
  text: string;
  image?: string; // optional image to send with this message
  order: number; // order within the sequence
  time?: string; // custom time HH:MM format
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  role: string;
  color: string;
  colorClass: string;
  avatar: string;
  customMessage?: string; // legacy single message
  customImage?: string; // legacy single image
  customMessages?: CharacterMessage[]; // multiple messages support
  order?: number;
}

export interface ChatMessage {
  id: string;
  characterId: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  imageUrl?: string;
  replyTo?: string;
}

export const defaultFemaleCharacters: Character[] = [
  { id: 'zamp', name: 'LA ZAMP', emoji: '💅', role: 'Queen del Cringe', color: 'var(--char-pink)', colorClass: 'bg-char-pink', avatar: avatarZamp },
  { id: 'fashionblo', name: "LA FASHION BLO'", emoji: '👗', role: 'Fashion Police', color: 'var(--char-purple)', colorClass: 'bg-char-purple', avatar: avatarFashionblo },
  { id: 'bkkin', name: 'BKKIN', emoji: '🔪', role: 'La Cinica', color: 'var(--char-red)', colorClass: 'bg-char-red', avatar: avatarBkkin },
  { id: 'gmmon', name: 'GMMON', emoji: '🍷', role: 'La Drammatica', color: 'var(--char-orange)', colorClass: 'bg-char-orange', avatar: avatarGmmon },
  { id: 'cularott', name: 'CULAROTT', emoji: '💀', role: 'La Savage', color: 'var(--char-teal)', colorClass: 'bg-char-teal', avatar: avatarCularott },
];

export const defaultMaleCharacters: Character[] = [
  { id: 'upappon', name: "U'PAPPON", emoji: '🫄', role: 'Lo Spaccone', color: 'var(--char-blue)', colorClass: 'bg-char-blue', avatar: avatarUpappon },
  { id: 'crnut', name: 'CRNUT', emoji: '🤘', role: 'Il Rocker', color: 'var(--char-green)', colorClass: 'bg-char-green', avatar: avatarCrnut },
  { id: 'ghigghion', name: 'GHIGGHION', emoji: '🤡', role: 'Il Clown', color: 'var(--char-yellow)', colorClass: 'bg-char-yellow', avatar: avatarGhigghion },
  { id: 'squagghiat', name: 'SQUAGGHIAT', emoji: '🧊', role: 'Il Freddo', color: 'var(--char-cyan)', colorClass: 'bg-char-cyan', avatar: avatarSquagghiat },
  { id: 'rkknid', name: 'RKKNID', emoji: '💁‍♀️', role: 'Il Serpente', color: 'var(--char-orange-alt)', colorClass: 'bg-char-orange-alt', avatar: avatarRkknid },
];

export const defaultVipCharacters: Character[] = [
  { id: 'vip1', name: 'IL BOSS', emoji: '👑', role: 'Il Capo', color: 'var(--char-pink)', colorClass: 'bg-char-pink', avatar: avatarUpappon },
  { id: 'vip2', name: 'LA DIVA', emoji: '💎', role: 'La Star', color: 'var(--char-purple)', colorClass: 'bg-char-purple', avatar: avatarFashionblo },
  { id: 'vip3', name: 'IL CRITICO', emoji: '🎭', role: 'Il Giudice', color: 'var(--char-red)', colorClass: 'bg-char-red', avatar: avatarGhigghion },
  { id: 'vip4', name: 'LA VELENO', emoji: '🐍', role: 'La Perfida', color: 'var(--char-teal)', colorClass: 'bg-char-teal', avatar: avatarBkkin },
  { id: 'vip5', name: 'IL FOLLE', emoji: '🤪', role: 'Lo Sregolato', color: 'var(--char-cyan)', colorClass: 'bg-char-cyan', avatar: avatarSquagghiat },
];

export const defaultGroupNames: Record<GroupType, string> = {
  female: 'Le Vipere 🐍',
  male: 'Bastardon 🔥',
  vip: 'VIP Lounge 👑',
};
