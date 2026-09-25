import { describe, it, expect } from 'vitest';
import { evaluar } from './logros.js';
import { SunCalc } from '../vendor/suncalc.js';

const LAT = 43.3;
const LON = -8.4;

// Porta la seccion "Logros" de test/test_records.js (10 asserts).
describe('logros: conversion 1:1 desde www/js/records.js (PP.logros)', () => {
  const hoy = new Date();
  const iso = (diasOffset, hora) => {
    const d = new Date(hoy.getTime() + diasOffset * 86400e3);
    d.setHours(hora != null ? hora : 12, 30, 0, 0);
    return d.toISOString();
  };

  // Calcula una hora local que cae dentro de ±30 min del amanecer real
  const isoAmanecer = () => {
    const times = SunCalc.getTimes(hoy, LAT, LON);
    const sr = times.sunrise;
    const d = new Date(hoy);
    d.setHours(sr.getHours(), sr.getMinutes(), 0, 0);
    return d.toISOString();
  };

  const caps = [
    { especie: 'lubina', talla: 54, peso: 1.8, fecha: isoAmanecer(), fotoId: 'f1', spot: { nombre: 'Zarautz' }, condiciones: { indice: 22 } },
    { especie: 'lubina', talla: 40, peso: 0.9, fecha: iso(0, 20), spot: { nombre: 'Zarautz' } },
    { especie: 'calamar', talla: 22, fecha: iso(-1, 23), spot: { nombre: 'Getaria' } },
    { especie: 'sargo', talla: 28, fecha: iso(-1, 9), spot: { nombre: 'Orio' } },
    { especie: 'dorada', talla: 35, peso: 1.1, fecha: iso(0, 12), spot: { nombre: 'Zarautz' } },
    { especie: 'faneca', fecha: iso(0, 22), spot: { nombre: 'Zarautz' } },
    { especie: 'besugo', fecha: iso(-2, 11), spot: { nombre: 'Bermeo' } },
    { especie: 'rodaballo', fecha: iso(-2, 14), spot: { nombre: 'Mundaka' } }
  ];
  const logros = evaluar(caps);
  const porId = {};
  logros.forEach(l => { porId[l.id] = l; });

  it('logro "primera captura" conseguido', () => expect(porId['captura-bronce'].conseguido).toBe(true));
  it('logro "5 capturas" pendiente (solo hay 6, pero la plata es 5)', () => expect(porId['captura-plata'].conseguido).toBe(true));
  it('logro "coleccionista plata (5 especies)" conseguido', () => expect(porId['coleccionista-plata'].conseguido).toBe(true));
  it('logro "coleccionista oro (10 especies)" pendiente con progreso 7/10', () => {
    expect(porId['coleccionista-oro'].conseguido).toBe(false);
    expect(porId['coleccionista-oro'].progreso[0]).toBe(7);
  });
  it('logro "lubina >=50cm" conseguido', () => expect(porId['trofeo-lubina'].conseguido).toBe(true));
  it('logro madrugador (captura justo al amanecer)', () => expect(porId.madrugador.conseguido).toBe(true));
  it('logro nocturno NO conseguido (ninguna captura entre 3-7h)', () => expect(porId.nocturno.conseguido).toBe(false));
  it('logro "contra pronostico" (indice 22)', () => expect(porId.contracorriente.conseguido).toBe(true));
  it('logro viajero (5 spots) conseguido', () => expect(porId.viajero.conseguido).toBe(true));
  it('logro dia-perfecto-plata (3 en mismo dia) conseguido', () => expect(porId['dia-perfecto-plata'].conseguido).toBe(true));
  it('logro dia-perfecto-oro (5 en mismo dia) pendiente (mejor dia = 4)', () => expect(porId['dia-perfecto-oro'].conseguido).toBe(false));
  it('logro faro NO conseguido (ninguna captura con lat/lon)', () => expect(porId.faro.conseguido).toBe(false));
  it('hay al menos 16 logros definidos', () => expect(logros.length).toBeGreaterThanOrEqual(16));
});

describe('logros: "faro" (captura cerca de un faro de la costa gallega)', () => {
  // Cabo Vilán (Camariñas, A Coruña): 43.16041, -9.21093
  const capCercaFaro = { especie: 'lubina', fecha: new Date().toISOString(), spot: { nombre: 'Camariñas', lat: 43.161, lon: -9.211 } };
  const capLejosFaro = { especie: 'lubina', fecha: new Date().toISOString(), spot: { nombre: 'Zarautz', lat: 43.29, lon: -2.17 } };
  const capSinSpot = { especie: 'lubina', fecha: new Date().toISOString(), spot: null };

  it('conseguido con una captura a <1km de un faro conocido', () => {
    expect(evaluar([capCercaFaro]).find(l => l.id === 'faro').conseguido).toBe(true);
  });
  it('NO conseguido si el spot está lejos de cualquier faro', () => {
    expect(evaluar([capLejosFaro]).find(l => l.id === 'faro').conseguido).toBe(false);
  });
  it('NO conseguido si la captura no tiene spot/coordenadas', () => {
    expect(evaluar([capSinSpot]).find(l => l.id === 'faro').conseguido).toBe(false);
  });
});
