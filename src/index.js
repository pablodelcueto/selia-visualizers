import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.css';

import 'jquery/dist/jquery.min.js';
import 'popper.js/dist/popper.min.js';
import 'bootstrap/dist/js/bootstrap.min.js';

import React from 'react';
import ReactDOM from 'react-dom';


import(/* webpackIgnore: true */'/visualizer.js').then(module => {
  var config = {
    canvas: document.getElementById('visualizerCanvas'),
    active: true,
    itemInfo: {
      url: 'http://selia2.conabio.gob.mx/media/items/1/18/15/1c387e2689517f306c165af897d7146151391283a1ae877d2934e795cc0fef58.wav',
    }
  }

  var visualizer = new Visualizer.default(config);

  ReactDOM.render(
    visualizer.renderToolbar(),
    document.getElementById('toolbar'),
    () => {
      visualizer.adjustSize();
      visualizer.draw();
    });
});
