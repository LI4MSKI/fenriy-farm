/* ZUFÄLLIGE EREIGNISSE: selten, kurz, immer eine positive Überraschung.
 * Ein Angebot erscheint oben in einer kleinen Karte (siehe HUD) und muss innerhalb
 * eines kurzen Zeitfensters angeklickt werden, sonst verschwindet es wieder.
 * Zeiten ändern: GAP_MIN/GAP_MAX (Abstand), OFFER_WIN (Zeit zum Anklicken), BUFF_DUR (Wirkdauer) unten. */
(function () {
  const EV = FF.events = {};

  const TYPES = {
    merchant: { name: 'Reisender Händler', desc: 'Baukosten -20 % für kurze Zeit' },
    golden: { name: 'Goldene Stunde', desc: 'Verkaufspreise +25 % für kurze Zeit' },
    treasure: { name: 'Schatzfund', desc: 'Sofortiger Fenriy-Bonus' }
  };
  const ORDER = ['merchant', 'golden', 'treasure'];

  const GAP_MIN = 300, GAP_MAX = 600;  // Sekunden aktiver Spielzeit zwischen zwei Angeboten
  const OFFER_WIN = 25;                // Sekunden Zeit, um ein Angebot anzuklicken
  const BUFF_DUR = 45;                 // Sekunden Wirkdauer von Händler/Goldener Stunde
  EV.OFFER_WIN = OFFER_WIN;

  function gap() { return GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN); }

  EV.offer = null;    // { type }
  EV.offerT = 0;      // Restzeit zum Anklicken
  EV.buff = null;      // 'merchant' | 'golden'
  EV.buffT = 0;
  EV.nextT = gap();
  EV.costMult = 1;
  EV.priceMult = 1;

  EV.typeInfo = function (id) { return TYPES[id]; };

  EV.update = function (dt) {
    if (!FF.state) return;
    if (EV.buff) {
      EV.buffT -= dt;
      if (EV.buffT <= 0) {
        EV.buff = null; EV.costMult = 1; EV.priceMult = 1;
        FF.emit('toast', { msg: 'Das Ereignis ist vorbei.', type: 'warn' });
      }
    }
    if (EV.offer) {
      EV.offerT -= dt;
      if (EV.offerT <= 0) {
        EV.offer = null;
        FF.emit('event', null);
      }
      return;
    }
    if (!EV.buff) {
      EV.nextT -= dt;
      if (EV.nextT <= 0) {
        EV.offer = { type: ORDER[Math.floor(Math.random() * ORDER.length)] };
        EV.offerT = OFFER_WIN;
        FF.emit('event', EV.offer);
      }
    }
  };

  /* Angebot einsammeln (vom Spieler per Klick auf die Ereignis-Karte) */
  EV.claim = function () {
    if (!EV.offer) return;
    const type = EV.offer.type;
    EV.offer = null;
    FF.emit('event', null);
    if (type === 'treasure') {
      const bonus = Math.max(50, Math.round((FF.rt ? FF.rt.rate : 0) * 120)) || 200;
      FF.earn(bonus, undefined, undefined, true);
      FF.emit('float', { x: 0, y: 0, text: '+' + FF.util.fmt(bonus), col: '#ffe27a', hud: true });
      FF.emit('toast', { msg: 'Schatzfund: +' + FF.util.fmt(bonus) + ' Fenriy!', type: 'good' });
    } else {
      EV.buff = type;
      EV.buffT = BUFF_DUR;
      if (type === 'merchant') EV.costMult = 0.8;
      if (type === 'golden') EV.priceMult = 1.25;
      FF.emit('toast', { msg: TYPES[type].name + ': ' + TYPES[type].desc + '!', type: 'good' });
    }
  };
})();
