import assert from 'node:assert/strict';
import test from 'node:test';
import { CISAGA_VILLAGES, INITIAL_UMKM_LISTINGS } from '../data/cisagaData';
import { buildCisagaProfileSlides, getNextSlideIndex } from './cisagaProfileSlides';

const EXPECTED_11_VILLAGES = [
  'Desa Bangunharja',
  'Desa Cisaga',
  'Desa Danasari',
  'Desa Girimukti',
  'Desa Karyamulya',
  'Desa Kepel',
  'Desa Mekarmukti',
  'Desa Sidamulya',
  'Desa Sukahurip',
  'Desa Tanjungjaya',
  'Desa Wangunjaya',
];

test('buildCisagaProfileSlides creates overview slide plus all 11 Cisaga villages', () => {
  assert.equal(CISAGA_VILLAGES.length, 11);
  for (const villageName of EXPECTED_11_VILLAGES) {
    assert.ok(
      CISAGA_VILLAGES.some((v) => v.name === villageName),
      `Expected ${villageName} in CISAGA_VILLAGES`
    );
  }

  const slides = buildCisagaProfileSlides(CISAGA_VILLAGES, INITIAL_UMKM_LISTINGS, 74);

  assert.equal(slides.length, 12);
  assert.equal(slides[0].id, 'wilayah-kecamatan-cisaga');
  assert.equal(slides[0].indexLabel, '01');
  assert.equal(slides[0].umkmCount, 74);
  assert.match(slides[0].subtitle, /11 Desa Terhubung/);
  assert.equal(slides[0].villageFilterTarget, null);

  const cisagaCenterSlide = slides.find((s) => s.villageFilterTarget === 'Desa Cisaga');
  assert.ok(cisagaCenterSlide);
  assert.match(cisagaCenterSlide.subtitle, /Pusat Pemerintahan/i);

  const bangunharjaSlide = slides.find((s) => s.villageFilterTarget === 'Desa Bangunharja');
  assert.ok(bangunharjaSlide);
  assert.equal(bangunharjaSlide.shortLabel, 'Bangunharja');
  assert.equal(bangunharjaSlide.umkmCount, 9);

  const sukahuripSlide = slides.find((s) => s.villageFilterTarget === 'Desa Sukahurip');
  assert.ok(sukahuripSlide);
  assert.equal(sukahuripSlide.shortLabel, 'Sukahurip');
});

test('getNextSlideIndex wraps cleanly in both directions for 12 slides', () => {
  assert.equal(getNextSlideIndex(0, 'prev', 12), 11);
  assert.equal(getNextSlideIndex(11, 'next', 12), 0);
  assert.equal(getNextSlideIndex(2, 'next', 12), 3);
  assert.equal(getNextSlideIndex(2, 'prev', 12), 1);
  assert.equal(getNextSlideIndex(0, 'next', 0), 0);
});
