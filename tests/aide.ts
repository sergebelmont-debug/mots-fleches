import { expect } from 'vitest';
import type { Grille } from '../src/engine/grille';
import { saisirLettre, selectionnerMot, type Partie } from '../src/engine/partie';

/**
 * Joue un mot comme un joueur : on le sélectionne, puis on ne tape que les lettres manquantes.
 * Vérifie au passage que le curseur se trouve toujours sur la prochaine case vide
 * (il doit sauter les lettres déjà posées par les mots croisés).
 */
export function jouerMot(g: Grille, depart: Partie, id: number): Partie {
  const mot = g.mots[id];
  const vides = mot.cases.filter((k) => depart.saisie[k] === '');
  let p = selectionnerMot(g, depart, id);
  for (const k of vides) {
    expect(p.motActif, `mot actif pendant la saisie de ${mot.reponse}`).toBe(id);
    expect(p.caseActive, `curseur pendant la saisie de ${mot.reponse}`).toBe(k);
    p = saisirLettre(g, p, mot.reponse[mot.cases.indexOf(k)]);
  }
  return p;
}
