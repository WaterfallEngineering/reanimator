/* vim: set et ts=2 sts=2 sw=2: */
$(document).ready(function () {
  // http://bost.ocks.org/mike/shuffle/
  function shuffle(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

      // Pick a remaining element…
      i = Math.floor(Math.random() * m--);

      // And swap it with the current element.
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }

    return array;
  }

  function init(config) {
    var numTiles = config.tiles.across * config.tiles.down;
    var tiles = [];

    var $tileTemplate = $('.tile-template');
    var $container = $('.tile-container');

    config.image.width *= config.image.scalingFactor;
    config.image.height *= config.image.scalingFactor;

    $container.css('width', config.image.width).
      css('height', config.image.height);
    config.tiles.width = Math.floor(config.image.width / config.tiles.across);
    config.tiles.height = Math.floor(config.image.height / config.tiles.down);

    var backgroundSize = (config.tiles.across * 100) + '%';

    var $tiles, $emptyTile;

    var x, y, $tile;
    for (var i = 0; i < numTiles - 1; i++) {
      x = i % config.tiles.across;
      y = Math.floor(i / config.tiles.across);
      $tile = $tileTemplate.clone().
        removeClass('tile-template').
        css('width', config.tiles.width + 'px').
        css('height', config.tiles.height + 'px').
        css('background-size', backgroundSize).
        css('background-position',
          (x * 50) + '% ' +
          (y * 50) + '%').
        data('index', i);
      $tile.find('.text').text(i);
      $container.append($tile);
      tiles.push($tile);
      placeTile($tile, i);
    }
    $tiles = $container.find('.tile');

    $emptyTile = $tileTemplate.clone().
      empty().
      addClass('empty');
    tiles.push($emptyTile);

    shuffle(tiles);
    tiles.forEach(placeTile);
    markPlayableTiles();

    $container.on('click', '.playable', function (e) {
      var $tile = $(this);
      var from = $tile.data('index');
      var to = $emptyTile.data('index');

      tiles[to] = $tile;
      placeTile($tile, to);

      tiles[from] = $emptyTile;
      placeTile($emptyTile, from);

      markPlayableTiles();
    });

    function placeTile($tile, i) {
      $tile.css('left',
        ((i % config.tiles.across) * config.tiles.width) + 'px');
      $tile.css('top',
        (Math.floor(i / config.tiles.down) * config.tiles.height) + 'px');
      $tile.data('index', i);
    }

    function markPlayableTiles() {
      var emptyIndex = $emptyTile.data('index');
      var indices = [
        emptyIndex - config.tiles.across,
        emptyIndex - 1,
        emptyIndex + 1,
        emptyIndex + config.tiles.across
      ];

      $tiles.removeClass('playable');

      var index;
      while (indices.length > 0) {
        index = indices.pop();
        if (tiles[index]) {
          tiles[index].addClass('playable');
        }
      }
    }
  }

  var config = {
    image: {
      scalingFactor: 0.4,
      width: 982,
      height: 645,
      offset: {
        x: 168,
        y: 0
      }
    },
    tiles: {
      across: 4,
      down: 4,
      width: 100,
      height: 100 
    }
  };

  if (location.search.slice(1) === 'replay') {
    $(window).on('message', function (e) {
      var log = JSON.parse(e.originalEvent.data);
      Reanimator.replay(log, {
        delay: 'realtime'
      });
      init(config);
    });
  } else {
    setTimeout(function () {
      Reanimator.capture();
      init(config);
    }, 0);
  }
});
