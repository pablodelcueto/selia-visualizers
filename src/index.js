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
      url: 'http://localhost:3000/',
    }
  }

  var visualizer = new Visualizer.default(config);

  ReactDOM.render(
    visualizer.renderToolbar(),
    document.getElementById('toolbar'),
    () => {
      visualizer.adjustSize();
    });
});
