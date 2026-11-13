import { customAlphabet } from 'nanoid';

// Unambiguous alphabet: no 0, O, 1, I, l
const UNAMBIGUOUS_ALPHABET = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

export const generateTournamentCode = customAlphabet(UNAMBIGUOUS_ALPHABET, 8);
