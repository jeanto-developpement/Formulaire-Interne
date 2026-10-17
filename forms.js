/* ===== Bibliothèque QR intégrée (qrcode-generator 1.4.4, Kazuhiko Arase, licence MIT) — voir vendor/README.txt ===== */
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

(function (factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof exports === 'object') {
      module.exports = factory();
  }
}(function () {
    return qrcode;
}));
/* ===== fin de la bibliothèque QR ===== */

/* Flo-Fab — définitions des formulaires (écran + impression), bilingues FR / EN */
(function () {
"use strict";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const v = esc;

/* ---------- langue ---------- */
let LANG = "fr";
let BILINGUAL = false;                 // vrai pendant la fabrication d'un PDF bilingue (Test de pompe) : « Français / English »
// « Français / English » sans répéter ce qui est commun : « SECTION 1 — DONNÉES BRUTES / RAW DATA », « Débit / Flow (Qg) »
const biJoin = (fr, en) => {
  fr = String(fr); en = String(en);
  const norm = t => t.replace(/\s+([:;!?%])/g, "$1").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (fr === en || norm(fr) === norm(en)) return fr;
  let i = 0; while (i < fr.length && i < en.length && fr[i] === en[i]) i++;
  let pre = fr.slice(0, i); const cut = pre.lastIndexOf(" — ");
  pre = cut >= 0 ? pre.slice(0, cut + 3) : "";
  const a = fr.slice(pre.length), b = en.slice(pre.length);
  let j = 0; while (j < a.length && j < b.length && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  let suf = a.slice(a.length - j); const k = suf.indexOf(" (");
  suf = k >= 0 ? suf.slice(k) : "";
  const a2 = a.slice(0, a.length - suf.length), b2 = b.slice(0, b.length - suf.length);
  return a2 && b2 ? `${pre}${a2} / ${b2}${suf}` : `${fr} / ${en}`;
};
const L = (fr, en) => BILINGUAL ? biJoin(fr, en) : (LANG === "en" ? en : fr);
const bilingual = fn => { const prev = BILINGUAL; BILINGUAL = true; try { return fn(); } finally { BILINGUAL = prev; } };

/* ---------- heures ---------- */
const toMin = x => { if (!x) return null; const [h, m] = x.split(":").map(Number); return h * 60 + m; };
const diff = (a, b) => { const x = toMin(a), y = toMin(b); if (x == null || y == null) return null; let d = y - x; if (d < 0) d += 1440; return d; };
const fmt = m => m == null ? "—" : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
function times(s) {
  const out = diff(s.offDep, s.cliArr), site = diff(s.cliArr, s.cliDep), back = diff(s.cliDep, s.offArr);
  let all = diff(s.offDep, s.offArr);
  if (all == null && [out, site, back].some(x => x != null)) all = [out, site, back].reduce((a, x) => a + (x || 0), 0);
  return { out, site, back, all };
}

/* ---------- gabarits écran ---------- */
const fld = (p, k, label, o = {}) => {
  const a = (o.auto ? ` autocomplete="${o.auto}"` : "") + (o.mode ? ` inputmode="${o.mode}"` : "") + (o.mirror ? ` data-mirror="${o.mirror}"` : "") + (o.pref ? ` data-pref="${o.pref}"` : "");
  return `<div class="f"><label for="${p}-${k}">${label}</label><input type="${o.type || "text"}" id="${p}-${k}" data-k="${k}"${a}></div>`;
};
const area = (p, k, label, rows) =>
  `<div class="f"><label for="${p}-${k}">${label}</label><textarea id="${p}-${k}" data-k="${k}" rows="${rows || 2}"></textarea></div>`;
const chk = (k, label) => `<label class="chk"><input type="checkbox" data-k="${k}"><span>${label}</span></label>`;
const chkVal = (k, label, vk, unit) =>
  `<div class="chkval">${chk(k, label)}<input class="sm" inputmode="decimal" data-k="${vk}" aria-label="${unit}"><span>${unit}</span></div>`;
const reading = (ck, label, pre) =>
  `<div class="reading">${chk(ck, label)}${[1, 2, 3].map(i =>
    `<label class="rd"><span>${i}</span><input inputmode="decimal" data-k="${pre}${i}" aria-label="${label} ${i}"></label>`).join("")}</div>`;

const EMAIL = { type: "email", auto: "email", mode: "email" };
const lbl = {
  departure: () => L("Départ", "Departure"),
  arrival: () => L("Arrivée", "Arrival")
};
const timeFld = (p, k, label) =>
  `<div class="f"><label for="${p}-${k}">${label}</label><input type="time" id="${p}-${k}" data-k="${k}"><button class="now" type="button" data-now="${k}">${L("Maintenant", "Now")}</button></div>`;

const hours = p => `
  <section class="sec" aria-label="${L("Heures", "Hours")}">
    <h2 class="bar">${L("HEURES", "HOURS")}</h2>
    <div class="times">
      <div class="tcol"><h3>${L("Bureau", "Office")}</h3>${timeFld(p, "offDep", lbl.departure())}${timeFld(p, "offArr", lbl.arrival())}</div>
      <div class="tcol"><h3>${L("Client", "Work place")}</h3>${timeFld(p, "cliArr", lbl.arrival())}${timeFld(p, "cliDep", lbl.departure())}</div>
      <div class="tcol" aria-live="polite"><h3>Total</h3>
        <div class="tot"><span>${L("Trajet aller", "Outbound trip")}</span><b data-out="out">—</b></div>
        <div class="tot"><span>${L("Sur place", "On site")}</span><b data-out="site">—</b></div>
        <div class="tot"><span>${L("Trajet retour", "Return trip")}</span><b data-out="back">—</b></div>
        <div class="tot grand"><span>Total</span><b data-out="all">—</b></div>
      </div>
    </div>
  </section>`;

const sigBlock = p => `
  <section class="sec" aria-label="Signatures">
    <h2 class="bar">SIGNATURES</h2>
    <div class="sigcols">
      <div class="sigcol">
        <h3>${L("Technicien", "Technician")}</h3>
        ${fld(p, "sigTechName", L("Nom", "Name"), { auto: "name" })}
        ${fld(p, "techEmail", L("Courriel", "Email"), EMAIL)}
        <div class="sigwrap">
          <div class="sigbox"><canvas data-sig="sigTech" aria-label="${L("Zone de signature du technicien", "Technician signature area")}"></canvas><div class="hint">${L("Signature du technicien", "Technician signature")}</div></div>
          <div class="sigtools"><button class="btn ghost" type="button" data-clear="sigTech">${L("Effacer", "Clear")}</button></div>
        </div>
      </div>
      <div class="sigcol">
        <h3>${L("Client", "Customer")}</h3>
        ${fld(p, "sigName", L("Nom", "Name"))}
        ${fld(p, "email", L("Courriel", "Email"), { type: "email", mode: "email" })}
        <div class="sigwrap">
          <div class="sigbox"><canvas data-sig="sig" aria-label="${L("Zone de signature du client", "Customer signature area")}"></canvas><div class="hint">${L("Signature du client", "Customer signature")}</div></div>
          <div class="sigtools"><button class="btn ghost" type="button" data-clear="sig">${L("Effacer", "Clear")}</button></div>
        </div>
      </div>
    </div>
    <div class="f sigdate"><label for="${p}-sigDate">Date</label><input type="date" id="${p}-sigDate" data-k="sigDate"></div>
  </section>`;

const notesBlock = () => `
  <section class="sec" aria-label="Notes">
    <h2 class="bar">${L("NOTE", "NOTES")}</h2>
    <div class="works"><textarea data-k="notes" aria-label="Notes" placeholder="Notes…" style="min-height:180px"></textarea></div>
  </section>`;

/* =====================================================================
   1. RAPPORT DE SERVICE
   ===================================================================== */
const REASONS = [
  ["service", "Appel de service", "Service call"], ["repair", "Réparation", "Repair"],
  ["maint", "Entretien", "Maintenance"], ["startup", "Démarrage", "Start-up"],
  ["insp", "Inspection", "Inspection"], ["other", "Autres", "Others"]
];

function serviceHtml(p) {
  return hours(p) + `
  <section class="sec" aria-label="${L("Information générale", "General details")}">
    <h2 class="bar">${L("INFORMATION GÉNÉRALE", "GENERAL DETAILS")}</h2>
    <div class="grid2">
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "tech", L("Technicien", "Technician"), { auto: "name", mirror: "sigTechName" })}
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}${fld(p, "job", L("N° de job", "Job No"))}
      ${fld(p, "address", L("Adresse", "Address"), { auto: "street-address" })}${fld(p, "equip", L("Type d'équipement", "Type of equipment"))}
      ${fld(p, "contact", "Contact")}${fld(p, "model", L("Modèle", "Model"))}
      ${fld(p, "phone", L("Téléphone", "Phone"), { type: "tel", auto: "tel" })}${fld(p, "serial", L("N° de série", "Serial No"))}
      ${fld(p, "location", L("Emplacement", "Location"))}
    </div>
  </section>
  <section class="sec" aria-label="${L("Raisons", "Reasons")}">
    <h2 class="bar">${L("RAISONS", "REASONS")}</h2>
    <div class="reasons">${REASONS.map(([k, fr, en]) =>
      `<label class="reason"><span>${L(fr, en)}</span><input type="checkbox" data-k="r_${k}"></label>`).join("")}</div>
    <div class="f otherwrap" data-show-if="r_other" hidden><label for="${p}-otherTxt">${L("Précisez", "Specify")}</label><input id="${p}-otherTxt" data-k="otherTxt"></div>
  </section>
  <section class="sec" aria-label="${L("Travaux effectués", "Work done")}">
    <h2 class="bar">${L("TRAVAUX EFFECTUÉS", "WORK DONE")}</h2>
    <div class="works"><textarea data-k="works" aria-label="${L("Travaux effectués", "Work done")}" placeholder="${L("Décrivez les travaux effectués…", "Describe the work performed…")}"></textarea></div>
  </section>
  <section class="sec" aria-label="${L("Pièces utilisées", "Parts used")}">
    <h2 class="bar">${L("PIÈCES UTILISÉES", "PARTS USED")}</h2>
    <div style="overflow-x:auto">
      <table class="parts">
        <thead><tr><th class="pn">${L("N° pièce", "Part No")}</th><th>Description</th><th class="qty">${L("Qté", "Qty")}</th><th class="x"></th></tr></thead>
        <tbody data-parts></tbody>
      </table>
    </div>
    <button class="btn addrow" type="button" data-addpart>${L("+ Ajouter une pièce", "+ Add a part")}</button>
  </section>` + sigBlock(p);
}

function serviceInit({ host, state, changed }) {
  if (!Array.isArray(state.parts) || !state.parts.length) state.parts = [{}];
  // anciens brouillons : on retire les lignes vides en trop à la fin (il en reste toujours une)
  const empty = r => !(r.pn || r.desc || r.qty);
  while (state.parts.length > 1 && empty(state.parts[state.parts.length - 1])) state.parts.pop();
  const body = host.querySelector("[data-parts]");
  const render = () => {
    body.innerHTML = state.parts.map((p, i) => `<tr>
      <td><input data-i="${i}" data-p="pn" value="${esc(p.pn)}" aria-label="${L("N° pièce ligne", "Part No row")} ${i + 1}"></td>
      <td><input data-i="${i}" data-p="desc" value="${esc(p.desc)}" aria-label="Description ${L("ligne", "row")} ${i + 1}"></td>
      <td><input data-i="${i}" data-p="qty" value="${esc(p.qty)}" inputmode="decimal" aria-label="${L("Quantité ligne", "Quantity row")} ${i + 1}"></td>
      <td class="x"><button class="rm" type="button" data-rm="${i}" aria-label="${L("Retirer la ligne", "Remove row")} ${i + 1}">×</button></td></tr>`).join("");
  };
  body.addEventListener("input", e => {
    const t = e.target; if (t.dataset.p == null) return;
    state.parts[+t.dataset.i][t.dataset.p] = t.value; changed();
  });
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.parts.splice(+b.dataset.rm, 1);
    if (!state.parts.length) state.parts.push({});
    render(); changed();
  });
  host.querySelector("[data-addpart]").addEventListener("click", () => {
    state.parts.push({}); render(); body.querySelector("tr:last-child input").focus(); changed();
  });
  render();
}

/* ---------- impression : pièces communes ---------- */
const cb = x => `<span class="p-box">${x ? "✓" : ""}</span>`;
/* ---------- version du formulaire + horodatage : sur TOUS les PDF ---------- */
let PRINT_TYPE = null;                         // formulaire en cours d'impression (fixé par l'enveloppe de print(), voir registre)
const p2 = x => String(x).padStart(2, "0");
const stampNow = () => { const n = new Date(); return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())} ${p2(n.getHours())}:${p2(n.getMinutes())}`; };
const verLabel = t => { const f = t && FORMS[t]; return f ? `${L("Version", "Version")} ${f.version}${f.revised ? " (" + L("rév.", "rev.") + " " + f.revised + ")" : ""}` : ""; };
const titleOf = t => { const f = t && FORMS[t]; return f ? f.title : ""; };
// ligne d'identification du document : « Titre · Version 1.0 (rév. …) · Imprimé le 2026-10-03 18:26 »
const stampText = (t, s) => [titleOf(t), verLabel(t), `${L("Imprimé le", "Printed")} ${stampNow()}`, s && s.id ? `${L("Réf.", "Ref.")} ${s.id}` : ""].filter(Boolean).join(" · ");
const foot = s => `<div class="p-foot"><span>Flo-Fab Inc. · ${v(titleOf(PRINT_TYPE))} · ${v(verLabel(PRINT_TYPE))}</span><span>${L("Imprimé le", "Printed")} ${stampNow()} · ${L("Réf.", "Ref.")} ${v(s.id)}</span></div>`;

function printHead(s) {
  const t = times(s), f = m => m != null ? fmt(m) : "";
  const dep = L("Départ", "Departure"), arr = L("Arrivée", "Arrival");
  return `<div class="p-head">
    <img src="logo.svg" alt="">
    <div class="p-addr">860 boul. Industriel<br>Bois-des-Filion, QC<br>Canada, J6Z 4V7<br>Tel : (450) 621-2995<br>Fax : (450) 621-4995</div>
    <table class="p p-time">
      <tr><th colspan="2">${L("Bureau", "Office")}</th><th colspan="2">${L("Client", "Work place")}</th><th>Total</th></tr>
      <tr><td class="l">${dep}</td><td>${v(s.offDep)}</td><td class="l">${arr}</td><td>${v(s.cliArr)}</td><td>${f(t.out)}</td></tr>
      <tr><td class="l">${arr}</td><td>${v(s.offArr)}</td><td class="l">${dep}</td><td>${v(s.cliDep)}</td><td>${f(t.back)}</td></tr>
      <tr><td class="l" colspan="4" style="text-align:right">${L("Sur place", "On site")} : ${t.site != null ? fmt(t.site) : "—"} &nbsp;&nbsp; Total</td><td><b>${f(t.all)}</b></td></tr>
    </table>
  </div>`;
}

function printSig(s, barCls) {
  const em = L("Courriel :", "Email :");
  const img = d => d ? `<img src="${d}" alt="">` : `<div class="p-line"></div>`;
  return `<div class="avoid">
    <div class="${barCls}">SIGNATURE</div>
    <table class="p p-sig"><tr>
      <td style="width:40%"><b>${L("Technicien :", "Technician :")}</b> ${v(s.sigTechName || s.tech)}</td>
      <td><b>${L("Client :", "Customer :")}</b> ${v(s.sigName)}</td>
      <td style="width:22%"><b>Date :</b> ${v(s.sigDate)}</td></tr>
      <tr><td><b>${em}</b> ${v(s.techEmail)}</td><td colspan="2"><b>${em}</b> ${v(s.email)}</td></tr></table>
    <div class="p-sigrow"><div class="p-sigimg">${img(s.sigTech)}</div><div class="p-sigimg">${img(s.sig)}</div></div>
  </div>`;
}

function servicePrint(s) {
  const parts = (s.parts || []).filter(p => p.pn || p.desc || p.qty);
  while (parts.length < 6) parts.push({});
  const reasonsRow = REASONS.map(([k, fr, en]) => `<td>${L(fr, en)}<br>${cb(s["r_" + k])}</td>`).join("");
  return printHead(s) + `
  <div class="p-bar">${L("INFORMATION GÉNÉRALE", "GENERAL DETAILS")}</div>
  <table class="p p-gen">
    <tr><td><b>Date :</b>${v(s.date)}</td><td><b>${L("Technicien :", "Technician :")}</b>${v(s.tech)}</td></tr>
    <tr><td><b>${L("Client :", "Customer :")}</b>${v(s.customer)}</td><td><b>${L("N° de job :", "Job No :")}</b>${v(s.job)}</td></tr>
    <tr><td><b>${L("Adresse :", "Address :")}</b>${v(s.address)}</td><td><b>${L("Type d'équipement :", "Type of equipment :")}</b>${v(s.equip)}</td></tr>
    <tr><td><b>Contact :</b>${v(s.contact)}</td><td><b>${L("Modèle :", "Model :")}</b>${v(s.model)}</td></tr>
    <tr><td><b>${L("Téléphone :", "Phone :")}</b>${v(s.phone)}</td><td><b>${L("N° de série :", "Serial No :")}</b>${v(s.serial)}</td></tr>
    <tr><td colspan="2"><b>${L("Emplacement :", "Location :")}</b>${v(s.location)}</td></tr>
  </table>
  <div class="p-bar">${L("RAISONS", "REASONS")}</div>
  <table class="p p-rs"><tr>${reasonsRow}</tr>
  ${s.r_other && s.otherTxt ? `<tr><td colspan="6" style="text-align:left;font-weight:400"><b>${L("Autres :", "Others :")}</b> ${v(s.otherTxt)}</td></tr>` : ""}</table>
  <div class="p-bar">${L("TRAVAUX EFFECTUÉS", "WORK DONE")}</div>
  <div class="p-works">${v(s.works)}</div>
  <div class="avoid">
  <div class="p-bar">${L("PIÈCES UTILISÉES", "PARTS USED")}</div>
  <table class="p p-parts"><thead><tr><th style="width:24%">${L("N° PIÈCE", "PART NO")}</th><th>DESCRIPTION</th><th style="width:10%">${L("QTÉ", "QTY")}</th></tr></thead>
    <tbody>${parts.map(p => `<tr><td>${v(p.pn)}</td><td>${v(p.desc)}</td><td style="text-align:center">${v(p.qty)}</td></tr>`).join("")}</tbody></table>
  </div>` + printSig(s, "p-bar") + foot(s);
}

/* =====================================================================
   2 + 3. MISE EN MARCHE (champs communs)
   ===================================================================== */
function startupInfo(p) {
  return hours(p) + `
  <section class="sec" aria-label="${L("Information générale", "General details")}">
    <h2 class="bar">${L("RAPPORT DE MISE EN MARCHE", "START-UP REPORT")}</h2>
    <div class="grid2">
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "job", L("# Job", "Job #"))}
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}${fld(p, "project", L("Projet", "Project"))}
      ${area(p, "addr", L("Adresse (client)", "Address (customer)"), 3)}${area(p, "projAddr", L("Adresse (projet)", "Address (project)"), 3)}
      ${fld(p, "contact", "Contact")}${fld(p, "ref", L("Référence", "Reference"))}
      <div class="f"><label for="${p}-page">Page</label>
        <div class="pg"><input id="${p}-page" data-k="page" inputmode="numeric" aria-label="Page"><span>/</span><input data-k="pages" inputmode="numeric" aria-label="${L("Nombre de pages", "Number of pages")}"></div></div>
    </div>
  </section>`;
}

function startupInfoPrint(s) {
  return `<div class="m-bar">${L("RAPPORT DE MISE EN MARCHE", "START-UP REPORT")}</div>
  <table class="p m-info">
    <tr><td><b>Date :</b> ${v(s.date)}</td><td><b>${L("# Job :", "Job # :")}</b> ${v(s.job)}<span class="m-pg"><b>Page</b> ${v(s.page)} / ${v(s.pages)}</span></td></tr>
    <tr><td><div><b>${L("Client :", "Customer :")}</b> ${v(s.customer)}</div><div class="m-addr"><b>${L("Adresse :", "Address :")}</b> ${v(s.addr)}</div><div><b>Contact :</b> ${v(s.contact)}</div></td>
        <td><div><b>${L("Projet :", "Project :")}</b> ${v(s.project)}</div><div class="m-addr"><b>${L("Adresse :", "Address :")}</b> ${v(s.projAddr)}</div><div><b>${L("Référence :", "Reference :")}</b> ${v(s.ref)}</div></td></tr>
  </table>`;
}

/* impression : petits composants de ligne */
const it = (l, val, o = {}) =>
  `<span class="m-it"${o.f ? ` style="flex:${o.f}"` : ""}><b>${l}</b><span class="m-u">${v(val)}</span>${o.u ? `<b>${o.u}</b>` : ""}</span>`;
const line = (...a) => `<div class="m-line">${a.join("")}</div>`;
const ck = (x, label) => `<div class="m-ck">${cb(x)}<span>${label}</span></div>`;
const ckv = (x, label, val, unit) =>
  `<div class="m-ck">${cb(x)}<span class="m-tx">${label}</span><span class="m-u" style="flex:none;width:46px">${v(val)}</span><b>${unit}</b></div>`;
const readRow = (s, ckKey, label, pre) =>
  `<div class="m-line m-rd"><span class="m-lbl">${cb(s[ckKey])} ${label}</span>${[1, 2, 3].map(i => it(i, s[pre + i])).join("")}</div>`;
const noteBlock = s => `<div class="m-notes"><b>${L("NOTE :", "NOTES :")}</b><div class="m-nl">${v(s.notes)}</div></div>`;

/* ---------- pompes : 1 affichée, ajout au besoin ---------- */
const MAXP = 6, PN = [1, 2, 3, 4, 5, 6];
const pcount = s => Math.min(MAXP, Math.max(1, parseInt(s.pumpCount, 10) || 1));
const pumpBar = () => `<div class="pumpbar" data-pumpbar>
  <span>${L("Pompes", "Pumps")} : <b data-pumpcount>1</b></span>
  <button class="btn" type="button" data-pump-add>${L("+ Ajouter une pompe", "+ Add a pump")}</button>
  <button class="btn ghost danger" type="button" data-pump-del>${L("Retirer la dernière", "Remove last")}</button>
</div>`;
const volt = () => "Voltages", amper = () => L("Ampérages", "Amperages");
const make = () => L("Marque", "Make"), model = () => L("Modèle", "Model");
const tech = () => L("Technicien", "Technician");

/* =====================================================================
   2. MISE EN MARCHE — SUBMERSIBLE
   ===================================================================== */
const SUB_CHECKS = [
  ["Vérifier l'installation générale", "Check general installation"],
  ["Vérifier l'installation électrique", "Check electrical installation"],
  ["Vérifier et ajuster les overloads tel qu'indiqué sur la pompe", "Check and adjust overloads as indicated on the pump"],
  ["Vérifier que la pompe tourne librement", "Check that the pump turns freely"],
  ["Vérifier la rotation de la pompe", "Check pump rotation"],
  ["Vérifier et ajuster les contrôles de niveau", "Check and adjust level controls"],
  ["Vérifier et ajuster l'alarme de haut niveau", "Check and adjust high-level alarm"],
  ["Simuler les séquences d'opération", "Simulate operating sequences"]
];
const ampCheck = n => L(`Vérifier l'ampérage sur Pompe ${n}`, `Check amperage on Pump ${n}`);

function subHtml(p) {
  const pump = n => `<div class="card" data-pump="${n}"><h3>${L("Pompe", "Pump")} ${n}</h3><div class="mini">
    ${fld(p, `pump${n}_marque`, make())}${fld(p, `pump${n}_modele`, model())}
    ${fld(p, `pump${n}_hp`, "HP", { mode: "decimal" })}${fld(p, `pump${n}_vitesse`, L("Vitesse", "Speed"))}
    ${fld(p, `pump${n}_volts`, "Volts", { mode: "decimal" })}${fld(p, `pump${n}_debit`, "GPM", { mode: "decimal" })}
    ${fld(p, `pump${n}_tete`, "TDH", { mode: "decimal" })}${fld(p, `pump${n}_amps`, "Amps", { mode: "decimal" })}</div></div>`;
  const meas = n => `<div class="card" data-pump="${n}" role="group" aria-label="${L("Mesures pompe", "Pump readings")} ${n}"><h3>${L("Pompe", "Pump")} ${n} — ${L("mesures", "readings")}</h3>
    ${chk(`amp${n}`, ampCheck(n))}
    ${reading(`vchk${n}`, volt(), `v${n}_`)}${reading(`achk${n}`, amper(), `a${n}_`)}</div>`;
  return startupInfo(p) + `
  <section class="sec" aria-label="${L("Système submersible", "Submersible system")}">
    <h2 class="bar">${L("SYSTÈME SUBMERSIBLE", "SUBMERSIBLE SYSTEM")}</h2>
    ${pumpBar()}
    <div class="pumps">${PN.map(pump).join("")}
      <div class="card"><h3>${L("Contrôleur", "Controller")}</h3><div class="mini">
        ${fld(p, "ctl_marque", make())}${fld(p, "ctl_modele", model())}
        ${fld(p, "ctl_serie", L("N° de série", "Serial No"))}${fld(p, "ctl_type", "Type")}
        ${fld(p, "ctl_hp", "HP", { mode: "decimal" })}${fld(p, "ctl_volts", "Volts", { mode: "decimal" })}
        ${fld(p, "ctl_over", "Overloads")}</div></div>
    </div>
    <div class="pumps" style="padding-top:0">
      <div class="card"><h3>${L("Vérifications", "Checks")}</h3>${SUB_CHECKS.map((t, i) => chk(`chk${i + 1}`, L(...t))).join("")}</div>
      ${PN.map(meas).join("")}
    </div>
    ${fld(p, "tech", tech(), { auto: "name", mirror: "sigTechName" }).replace('class="f"', 'class="f sigdate"')}
  </section>` + notesBlock() + sigBlock(p);
}

function subPrint(s) {
  const N = pcount(s), PS = PN.slice(0, N);
  const pump = n => {
    const k = x => s[`pump${n}_${x}`];
    return `<div class="m-t">${L("POMPE", "PUMP")} ${n}</div>` +
      line(it(make(), k("marque")), it(model(), k("modele"), { f: 1.5 })) +
      line(it("HP", k("hp")), it(L("Vitesse", "Speed"), k("vitesse")), it("Volts", k("volts"))) +
      line(it("GPM", k("debit")), it("TDH", k("tete")), it("Amps", k("amps")));
  };
  const left = PS.map(pump).join("") + `<div class="m-t">${L("CONTRÔLEUR", "CONTROLLER")}</div>` +
    line(it(make(), s.ctl_marque), it(model(), s.ctl_modele)) +
    line(it(L("N° de série", "Serial No"), s.ctl_serie), it("Type", s.ctl_type)) +
    line(it("HP", s.ctl_hp), it("Volts", s.ctl_volts), it("Overloads", s.ctl_over)) +
    `<div style="margin-top:10px">${line(it(tech(), s.tech, { f: 1 }), `<span class="m-it" style="flex:.6"></span>`)}</div>`;
  const right = SUB_CHECKS.map((t, i) => ck(s[`chk${i + 1}`], L(...t))).join("") +
    PS.map(n => `<div class="m-gap"></div>` + ck(s[`amp${n}`], ampCheck(n)) +
      readRow(s, `vchk${n}`, volt() + " :", `v${n}_`) + readRow(s, `achk${n}`, amper() + " :", `a${n}_`)).join("");
  return printHead(s) + startupInfoPrint(s) + `
  <div class="m-bar">${L("SYSTÈME SUBMERSIBLE", "SUBMERSIBLE SYSTEM")}</div>
  <div class="m-cols last"><div class="m-col">${left}</div><div class="m-col">${right}</div></div>
  ${noteBlock(s)}` + printSig(s, "m-bar") + foot(s);
}

/* =====================================================================
   3. MISE EN MARCHE — SURPRESSEUR
   ===================================================================== */
const SUR_CHECKS = [
  ["Vérifier l'installation générale", "Check general installation"],
  ["Vérifier l'alignement (pompe horizontale seulement)", "Check alignment (horizontal pump only)"],
  ["Vérifier l'alimentation en eau", "Check water supply"],
  ["S'assurer que la pompe est exempte d'air", "Make sure the pump is free of air"],
  ["Vérifier que l'arbre de la pompe tourne librement", "Check that the pump shaft turns freely"],
  ["Vérifier la rotation de la pompe", "Check pump rotation"],
  ["Vérifier l'alimentation électrique", "Check electrical supply"]
];
const SUR_SYS = [
  ["s1", "Ajustement de la pression du réservoir", "Tank pressure adjustment", "s1v"],
  ["s2", "Ajustement du point de consigne", "Setpoint adjustment", "s2v"],
  ["s3", "Vérifier ajustement de basse pression d'aspiration", "Check low suction pressure adjustment", "s3v"]
];
const SUR_SYS2 = [
  ["s4", "Vérifier arrêt sur débit nul", "Check no-flow shutdown"],
  ["s5", "Vérifier l'alternance des pompes", "Check pump alternation"],
  ["s6", "Vérifier l'ajustement de l'aquastat", "Check aquastat adjustment"],
  ["s7", "Mettre le système en mode AUTO", "Place the system in AUTO mode"]
];

function surHtml(p) {
  const pump = n => `<div class="card" data-pump="${n}" role="group" aria-label="${L("Pompe", "Pump")} ${n}"><h3>${L("Pompe", "Pump")} ${n}</h3>
    <div class="mini">
      ${fld(p, `pump${n}_marque`, make())}${fld(p, `pump${n}_modele`, model())}
      ${fld(p, `pump${n}_serie`, L("No. série", "Serial No."))}${fld(p, `pump${n}_hp`, "HP", { mode: "decimal" })}
      ${fld(p, `pump${n}_rpm`, "RPM", { mode: "decimal" })}${fld(p, `pump${n}_amp`, "Amp", { mode: "decimal" })}
      ${fld(p, `pump${n}_tdh`, "TDH", { mode: "decimal" })}${fld(p, `pump${n}_gpm`, "GPM", { mode: "decimal" })}
    </div>
    <div style="margin-top:8px">${SUR_CHECKS.map((t, i) => chk(`pump${n}_c${i + 1}`, L(...t))).join("")}
    ${reading(`pump${n}_vchk`, volt(), `pump${n}_v`)}${reading(`pump${n}_achk`, amper(), `pump${n}_a`)}</div></div>`;
  return startupInfo(p) + `
  <section class="sec" aria-label="${L("Surpresseur", "Booster")}">
    <h2 class="bar">${L("SURPRESSEUR", "BOOSTER SYSTEM")}</h2>
    ${pumpBar()}
    <div class="pumps">${PN.map(pump).join("")}
      <div class="card"><h3>${L("Système", "System")}</h3>
        <div class="mini">
          <div class="f"><label for="${p}-pAsp">${L("Pression d'aspiration (PSI)", "Suction pressure (PSI)")}</label><input id="${p}-pAsp" data-k="pAsp" inputmode="decimal"></div>
          <div class="f"><label for="${p}-pRef">${L("Pression de refoulement (PSI)", "Discharge pressure (PSI)")}</label><input id="${p}-pRef" data-k="pRef" inputmode="decimal"></div>
        </div>
        <div style="margin-top:8px">
          ${SUR_SYS.map(([k, fr, en, vk]) => chkVal(k, L(fr, en), vk, "PSI")).join("")}
          ${SUR_SYS2.map(([k, fr, en]) => chk(k, L(fr, en))).join("")}
        </div>
      </div>
    </div>
    ${fld(p, "tech", tech(), { auto: "name", mirror: "sigTechName" }).replace('class="f"', 'class="f sigdate"')}
  </section>` + notesBlock() + sigBlock(p);
}

function surPrint(s) {
  const N = pcount(s);
  const pump = n => {
    const k = x => s[`pump${n}_${x}`];
    return `<div class="m-t">${L("POMPE", "PUMP")} ${n}</div>` +
      line(it(make(), k("marque")), it(model(), k("modele"))) +
      line(it(L("No. Série", "Serial No."), k("serie"), { f: 1.6 }), it("HP", k("hp")), it("RPM", k("rpm"))) +
      line(it("Amp", k("amp")), it("TDH", k("tdh")), it("GPM", k("gpm"))) +
      `<div class="m-gap"></div>` +
      SUR_CHECKS.map((t, i) => ck(s[`pump${n}_c${i + 1}`], L(...t))).join("") +
      readRow(s, `pump${n}_vchk`, volt() + " :", `pump${n}_v`) + readRow(s, `pump${n}_achk`, amper() + " :", `pump${n}_a`);
  };
  const sys = line(it(L("Pression d'Aspiration :", "Suction Pressure :"), s.pAsp, { u: "PSI" })) +
    line(it(L("Pression de Refoulement :", "Discharge Pressure :"), s.pRef, { u: "PSI" })) +
    `<div class="m-gap"></div>` +
    SUR_SYS.map(([k, fr, en, vk]) => ckv(s[k], L(fr, en), s[vk], "PSI")).join("") +
    SUR_SYS2.map(([k, fr, en]) => ck(s[k], L(fr, en))).join("");
  const techLine = `<div style="margin-top:8px">${line(it(tech() + " :", s.tech, { f: 1 }), `<span class="m-it" style="flex:.6"></span>`)}</div>`;
  const cells = PN.slice(0, N).map(pump); cells.push(`<div class="m-t">&nbsp;</div>` + sys);
  let rows = "";
  for (let i = 0; i < cells.length; i += 2) {
    const last = i + 2 >= cells.length;
    rows += `<div class="m-cols${last ? " last" : ""}"><div class="m-col">${cells[i]}${last ? techLine : ""}</div><div class="m-col">${cells[i + 1] || ""}</div></div>`;
  }
  return printHead(s) + startupInfoPrint(s) + `
  <div class="m-bar">${L("SURPRESSEUR", "BOOSTER SYSTEM")}</div>
  ${rows}
  ${noteBlock(s)}` + printSig(s, "m-bar") + foot(s);
}

/* =====================================================================
   4. ESTIMATION (soumission) — matériel + main-d'œuvre, avec calculs
   ===================================================================== */
const num = x => {
  if (x == null || x === "") return null;
  const n = parseFloat(String(x).replace(/\s/g, "").replace(/\$/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};
const money = n => n == null ? "" : n.toLocaleString(LANG === "en" ? "en-CA" : "fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyNZ = n => n ? money(n) : "";
const rate = x => { const n = num(x); return n == null ? v(x) : money(n); };

const LAB = [
  ["Ramassage", "Pick-up"], ["Estimation en atelier", "Shop estimate"], ["Main-d'œuvre atelier", "Shop labour"],
  ["Peinture", "Painting"], ["Nettoyage de la pompe", "Pump cleaning"], ["Nettoyage atelier", "Shop cleaning"],
  ["Usinage", "Machining"], ["Main-d'œuvre terrain", "Field labour"], ["Livraison", "Delivery"], ["Frais de camion", "Truck charges"]
];

function calcEst(s) {
  const sum = (arr, k) => arr.reduce((t, r) => t + (r[k] || 0), 0);
  const mat = (s.mat || []).map(r => {
    const q = num(r.qty), c = num(r.cost), sl = num(r.sell);
    return { tc: q != null && c != null ? q * c : null, ts: q != null && sl != null ? q * sl : null, a: num(r.act) };
  });
  const lab = LAB.map((_, i) => {
    const h = num(s[`lab${i}_h`]), c = num(s[`lab${i}_c`]), sl = num(s[`lab${i}_s`]);
    return { h, tc: h != null && c != null ? h * c : null, ts: h != null && sl != null ? h * sl : null, a: num(s[`lab${i}_a`]) };
  });
  const m = { cost: sum(mat, "tc"), sell: sum(mat, "ts"), act: sum(mat, "a") };
  const l = { hours: sum(lab, "h"), cost: sum(lab, "tc"), sell: sum(lab, "ts"), act: sum(lab, "a") };
  return { mat, lab, m, l, t: { cost: m.cost + l.cost, sell: m.sell + l.sell, act: m.act + l.act } };
}

const mf = (label, attrs) => `<label class="mf"><span>${label}</span><input ${attrs}></label>`;

function estHtml(p) {
  const sumRow = (label, g) => `<tr><th scope="row">${label}</th><td data-calc="${g}_cost">0,00</td><td data-calc="${g}_sell">0,00</td><td data-calc="${g}_act">0,00</td></tr>`;
  const tot = g => `<span>${L("Coût", "Cost")} <b data-calc="${g}_cost">0,00</b></span><span>${L("Vente", "Sell")} <b data-calc="${g}_sell">0,00</b></span><span>${L("Réel", "Actual")} <b data-calc="${g}_act">0,00</b></span>`;
  return `
  <section class="sec" aria-label="${L("Estimation", "Estimate")}">
    <h2 class="bar">${L("ESTIMATION", "ESTIMATE")}</h2>
    <div class="grid2">
      ${fld(p, "quote", L("Soumission no", "Quote no"))}
      <div class="f"><label for="${p}-currency">${L("Devise", "Currency")}</label><select id="${p}-currency" data-k="currency"><option value="CAD">CAD</option><option value="USD">USD</option></select></div>
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "tech", L("Préparée par", "Quote by"), { auto: "name" })}
    </div>
    <div class="esum" aria-live="polite">
      <table class="esum-t"><thead><tr><th></th><th>${L("Coût", "Cost")}</th><th>${L("Vente", "Sell")}</th><th>${L("Réel", "Actual")}</th></tr></thead>
      <tbody>${sumRow(L("Matériel", "Material"), "m")}${sumRow(L("Main-d'œuvre", "Labour"), "l")}${sumRow("Total", "t")}</tbody></table>
    </div>
  </section>
  <section class="sec" aria-label="${L("Pompe et moteur", "Pump and motor")}">
    <h2 class="bar">${L("POMPE / MOTEUR", "PUMP / MOTOR")}</h2>
    <div class="grid2">
      ${fld(p, "pumpModel", L("Pompe — modèle", "Pump — model"))}${fld(p, "pumpSN", L("Pompe — n° de série", "Pump — S/N"))}
      ${fld(p, "motorHP", L("Moteur — HP", "Motor — HP"), { mode: "decimal" })}${fld(p, "motorRPM", L("Moteur — RPM", "Motor — RPM"), { mode: "decimal" })}
      ${fld(p, "motorVolts", L("Moteur — Volts", "Motor — Volts"), { mode: "decimal" })}${fld(p, "motorFrame", L("Moteur — carcasse", "Motor — frame"))}
    </div>
  </section>
  <section class="sec" aria-label="${L("Client et projet", "Customer and project")}">
    <h2 class="bar">${L("CLIENT / PROJET", "CUSTOMER / PROJECT")}</h2>
    <div class="grid2">
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}${fld(p, "contact", "Contact")}
      ${fld(p, "address", L("Adresse (client)", "Address (customer)"))}${fld(p, "project", L("Projet", "Project"))}
      ${fld(p, "ref", L("Référence", "Reference"))}${fld(p, "projAddr", L("Adresse (projet)", "Address (project)"))}
    </div>
  </section>
  <section class="sec" aria-label="${L("Matériel", "Material")}">
    <h2 class="bar">${L("MATÉRIEL", "MATERIAL")}</h2>
    <div data-mat></div>
    <button class="btn addrow" type="button" data-addmat>${L("+ Ajouter une ligne", "+ Add a line")}</button>
    <div class="etot"><span>${L("TOTAL MATÉRIEL", "TOTAL MATERIAL")}</span>${tot("m")}</div>
  </section>
  <section class="sec" aria-label="${L("Main-d'œuvre", "Labour")}">
    <h2 class="bar">${L("MAIN-D'ŒUVRE", "LABOUR")}</h2>
    ${LAB.map(([fr, en], i) => `<div class="lrow"><div class="ldesc">${L(fr, en)}</div>
      <div class="lgrid">
        ${mf(L("Heures", "Hours"), `inputmode="decimal" data-k="lab${i}_h"`)}${mf(L("Taux coût", "Cost rate"), `inputmode="decimal" data-k="lab${i}_c"`)}
        ${mf(L("Taux vente", "Sell rate"), `inputmode="decimal" data-k="lab${i}_s"`)}${mf(L("Réel", "Actual"), `inputmode="decimal" data-k="lab${i}_a"`)}
      </div>
      <div class="mcalc"><span>${L("Total coût", "Total cost")} <b data-lc="${i}">—</b></span><span>${L("Total vente", "Total sell")} <b data-ls="${i}">—</b></span></div></div>`).join("")}
    <div class="etot"><span>${L("TOTAL MAIN-D'ŒUVRE", "TOTAL LABOUR")} (<b data-calc="l_hours">0</b> ${L("h", "h")})</span>${tot("l")}</div>
  </section>`;
}

function estRefresh(host, s) {
  const c = calcEst(s);
  host.querySelectorAll("[data-calc]").forEach(e => {
    const [g, k] = e.dataset.calc.split("_");
    e.textContent = k === "hours" ? String(+c[g][k].toFixed(2)) : money(c[g][k]);
  });
  host.querySelectorAll("[data-mc]").forEach(e => { const r = c.mat[+e.dataset.mc]; e.textContent = r && r.tc != null ? money(r.tc) : "—"; });
  host.querySelectorAll("[data-ms]").forEach(e => { const r = c.mat[+e.dataset.ms]; e.textContent = r && r.ts != null ? money(r.ts) : "—"; });
  host.querySelectorAll("[data-lc]").forEach(e => { const r = c.lab[+e.dataset.lc]; e.textContent = r.tc != null ? money(r.tc) : "—"; });
  host.querySelectorAll("[data-ls]").forEach(e => { const r = c.lab[+e.dataset.ls]; e.textContent = r.ts != null ? money(r.ts) : "—"; });
}

function estInit({ host, state, changed, refresh }) {
  if (!Array.isArray(state.mat) || !state.mat.length) state.mat = [{}];
  // anciens brouillons : on retire les lignes vides en trop à la fin (il en reste toujours une)
  const emptyRow = r => !(r.qty || r.pn || r.desc || r.cost || r.sell || r.act);
  while (state.mat.length > 1 && emptyRow(state.mat[state.mat.length - 1])) state.mat.pop();
  const box = host.querySelector("[data-mat]");
  const render = () => {
    box.innerHTML = state.mat.map((r, i) => `<div class="mrow">
      <div class="mrow-h"><b>${L("Ligne", "Line")} ${i + 1}</b><button class="rm" type="button" data-rm="${i}" aria-label="${L("Retirer la ligne", "Remove line")} ${i + 1}">×</button></div>
      <div class="mgrid">
        <label class="mf s2"><span>${L("Qté", "Qty")}</span><input data-i="${i}" data-m="qty" value="${esc(r.qty)}" inputmode="decimal"></label>
        <label class="mf s4"><span>${L("N° de pièce", "Part No")}</span><input data-i="${i}" data-m="pn" value="${esc(r.pn)}"></label>
        <label class="mf s6"><span>Description</span><input data-i="${i}" data-m="desc" value="${esc(r.desc)}"></label>
        <label class="mf s2"><span>${L("Taux coût", "Cost rate")}</span><input data-i="${i}" data-m="cost" value="${esc(r.cost)}" inputmode="decimal"></label>
        <label class="mf s2"><span>${L("Taux vente", "Sell rate")}</span><input data-i="${i}" data-m="sell" value="${esc(r.sell)}" inputmode="decimal"></label>
        <label class="mf s2"><span>${L("Réel", "Actual")}</span><input data-i="${i}" data-m="act" value="${esc(r.act)}" inputmode="decimal"></label>
      </div>
      <div class="mcalc"><span>${L("Total coût", "Total cost")} <b data-mc="${i}">—</b></span><span>${L("Total vente", "Total sell")} <b data-ms="${i}">—</b></span></div></div>`).join("");
  };
  box.addEventListener("input", e => {
    const t = e.target; if (t.dataset.m == null) return;
    state.mat[+t.dataset.i][t.dataset.m] = t.value; changed(); refresh();
  });
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.mat.splice(+b.dataset.rm, 1);
    if (!state.mat.length) state.mat.push({});
    render(); changed(); refresh();
  });
  host.querySelector("[data-addmat]").addEventListener("click", () => {
    state.mat.push({}); render(); changed(); refresh();
    const last = box.querySelector(".mrow:last-child input"); if (last) { last.scrollIntoView({ block: "center", behavior: "smooth" }); last.focus({ preventScroll: true }); }
  });
  render();
}

function estPrint(s) {
  const c = calcEst(s), dep = x => x ? x.toUpperCase() : x;
  const mat = (s.mat || []).filter(r => r.qty || r.pn || r.desc || r.cost || r.sell || r.act);
  const rows = mat.map(r => ({ r, k: c.mat[(s.mat || []).indexOf(r)] }));
  while (rows.length < 9) rows.push({ r: {}, k: {} });
  const sumRow = (label, g) => `<tr><th>${label}</th><td>${moneyNZ(c[g].cost)}</td><td>${moneyNZ(c[g].sell)}</td><td>${moneyNZ(c[g].act)}</td></tr>`;
  const matRows = rows.map(({ r, k }) => `<tr><td class="ctr">${v(r.qty)}</td><td>${v(r.pn)}</td><td>${v(r.desc)}</td><td class="n">${rate(r.cost)}</td><td class="n">${money(k.tc)}</td><td class="n">${rate(r.sell)}</td><td class="n">${money(k.ts)}</td><td class="n">${rate(r.act)}</td></tr>`).join("");
  const labRows = LAB.map(([fr, en], i) => `<tr><td class="ctr">${v(s[`lab${i}_h`])}</td><td class="ctr">${dep(L(fr, en))}</td><td class="n">${rate(s[`lab${i}_c`])}</td><td class="n">${money(c.lab[i].tc)}</td><td class="n">${rate(s[`lab${i}_s`])}</td><td class="n">${money(c.lab[i].ts)}</td><td class="n">${rate(s[`lab${i}_a`])}</td></tr>`).join("");
  return `<div class="p-head">
    <img src="logo.svg" alt="">
    <div class="p-addr">860 boul. Industriel<br>Bois-des-Filion, QC<br>Canada, J6Z 4V7<br>Tel : (450) 621-2995<br>Fax : (450) 621-4995</div>
    <table class="p e-sum"><tr><th></th><th>${L("Coût", "Cost")}</th><th>${L("Vente", "Sell")}</th><th>${L("Réel", "Actual")}</th></tr>
      ${sumRow(L("Matériel", "Material"), "m")}${sumRow(L("Main-d'œuvre", "Labour"), "l")}${sumRow("Total", "t")}</table>
  </div>
  <div class="e-bar"><span>${L("SOUMISSION :", "QUOTE :")} ${v(s.quote)}</span><b>${L("ESTIMATION", "ESTIMATE")}</b><span>${v(s.currency || "CAD")}</span></div>
  <div class="m-cols last e-info">
    <div class="m-col">
      <div class="e-sub">${L("POMPE", "PUMP")}</div>
      ${line(it(L("Modèle", "Model"), s.pumpModel))}${line(it(L("N° de série", "S/N"), s.pumpSN))}
      <div class="e-sub">${L("MOTEUR", "MOTOR")}</div>
      ${line(it("HP", s.motorHP), it("RPM", s.motorRPM))}${line(it("Volts", s.motorVolts), it(L("Carcasse", "Frame"), s.motorFrame))}
    </div>
    <div class="m-col">
      ${line(it(L("Client", "Customer"), s.customer, { f: 1.5 }), it("Contact", s.contact))}${line(it(L("Adresse", "Address"), s.address))}
      <div class="m-gap"></div>
      ${line(it(L("Projet", "Project"), s.project, { f: 1.5 }), it(L("Référence", "Reference"), s.ref))}${line(it(L("Adresse", "Address"), s.projAddr))}
    </div>
  </div>
  <div class="e-title">${L("MATÉRIEL", "MATERIAL")}</div>
  <table class="p e-tbl"><colgroup><col style="width:7%"><col style="width:15%"><col><col style="width:10%"><col style="width:11%"><col style="width:10%"><col style="width:11%"><col style="width:10%"></colgroup>
    <thead><tr><th>${L("QTÉ", "QTY")}</th><th>${L("N° DE PIÈCE", "PART NO.")}</th><th>DESCRIPTION</th><th>${L("TAUX COÛT", "COST RATE")}</th><th>${L("TOTAL COÛT", "TOTAL COST")}</th><th>${L("TAUX VENTE", "SELL RATE")}</th><th>${L("TOTAL VENTE", "TOTAL SELL")}</th><th>${L("RÉEL", "ACTUAL")}</th></tr></thead>
    <tbody>${matRows}
    <tr class="e-total"><td></td><td colspan="2">${L("TOTAL MATÉRIEL", "TOTAL MAT'L")}</td><td></td><td class="n">${moneyNZ(c.m.cost)}</td><td></td><td class="n">${moneyNZ(c.m.sell)}</td><td class="n">${moneyNZ(c.m.act)}</td></tr></tbody></table>
  <div class="e-title">${L("MAIN-D'ŒUVRE", "LABOUR")}</div>
  <table class="p e-tbl"><colgroup><col style="width:9%"><col style="width:26%"><col style="width:12%"><col style="width:14%"><col style="width:12%"><col style="width:14%"><col style="width:13%"></colgroup>
    <thead><tr><th>${L("HEURES", "HOURS")}</th><th>DESCRIPTION</th><th>${L("TAUX COÛT", "COST RATE")}</th><th>${L("TOTAL COÛT", "TOTAL COST")}</th><th>${L("TAUX VENTE", "SELL RATE")}</th><th>${L("TOTAL VENTE", "TOTAL SELL")}</th><th>${L("RÉEL", "ACTUAL")}</th></tr></thead>
    <tbody>${labRows}
    <tr class="e-total"><td class="ctr">${c.l.hours ? +c.l.hours.toFixed(2) : ""}</td><td class="ctr">${L("TOTAL MAIN-D'ŒUVRE", "TOTAL LABOUR")}</td><td></td><td class="n">${moneyNZ(c.l.cost)}</td><td></td><td class="n">${moneyNZ(c.l.sell)}</td><td class="n">${moneyNZ(c.l.act)}</td></tr></tbody></table>
  <div class="e-foot">${line(it(L("Préparée par :", "Quote by :"), s.tech, { f: 2 }), it("Date :", s.date, { f: 1 }))}</div>` + foot(s);
}

/* =====================================================================
   5. RÉQUISITION D'ACHAT (impression en paysage)
   ===================================================================== */
function reqHtml(p) {
  return `
  <section class="sec" aria-label="${L("Réquisition d'achat", "Purchase requisition")}">
    <h2 class="bar">${L("RÉQUISITION D'ACHAT", "PURCHASE REQUISITION")}</h2>
    <div class="grid2">
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "job", L("# Job", "Job #"))}
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}
    </div>
  </section>
  <section class="sec" aria-label="Descriptions">
    <h2 class="bar">DESCRIPTIONS <span>/ ${L("QUANTITÉ", "QUANTITY")}</span></h2>
    <div data-items></div>
    <button class="btn addrow" type="button" data-additem>${L("+ Ajouter une ligne", "+ Add a line")}</button>
  </section>
  <section class="sec" aria-label="Signatures">
    <h2 class="bar">SIGNATURES</h2>
    <div class="sigcols">
      <div class="sigcol">
        <h3>${L("Employé(e)", "Employee")}</h3>
        ${fld(p, "sigTechName", L("Nom", "Name"), { auto: "name", pref: "tech" })}
        <div class="sigwrap"><div class="sigbox"><canvas data-sig="sigEmp" aria-label="${L("Signature de l'employé", "Employee signature")}"></canvas><div class="hint">${L("Signature de l'employé(e)", "Employee signature")}</div></div>
        <div class="sigtools"><button class="btn ghost" type="button" data-clear="sigEmp">${L("Effacer", "Clear")}</button></div></div>
      </div>
      <div class="sigcol">
        <h3>${L("Approuvé par", "Approved by")}</h3>
        ${fld(p, "approver", L("Nom", "Name"), { auto: "off" })}
        <div class="sigwrap"><div class="sigbox"><canvas data-sig="sigApp" aria-label="${L("Signature de l'approbateur", "Approver signature")}"></canvas><div class="hint">${L("Signature de l'approbateur", "Approver signature")}</div></div>
        <div class="sigtools"><button class="btn ghost" type="button" data-clear="sigApp">${L("Effacer", "Clear")}</button></div></div>
      </div>
    </div>
  </section>`;
}

/* réduit une photo (caméra ou galerie) pour qu'elle reste légère dans le stockage de l'appareil */
function shrinkImage(file, maxDim = 720, quality = 0.62) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

function reqInit({ host, state, changed, toast }) {
  if (!Array.isArray(state.items) || !state.items.length) state.items = [{}];
  // anciens brouillons : on retire les lignes vides en trop à la fin (il en reste toujours une)
  const emptyItem = r => !(r.desc || r.qty || r.photo);
  while (state.items.length > 1 && emptyItem(state.items[state.items.length - 1])) state.items.pop();
  const box = host.querySelector("[data-items]");
  const render = () => {
    box.innerHTML = state.items.map((r, i) => `<div class="itrow">
      <textarea rows="2" data-i="${i}" data-m="desc" placeholder="Description" aria-label="Description ${L("ligne", "line")} ${i + 1}">${esc(r.desc)}</textarea>
      <input data-i="${i}" data-m="qty" value="${esc(r.qty)}" placeholder="${L("Qté *", "Qty *")}" inputmode="decimal" aria-required="true" aria-label="${L("Quantité (obligatoire) ligne", "Quantity (required) line")} ${i + 1}">
      <button class="rm" type="button" data-rm="${i}" aria-label="${L("Retirer la ligne", "Remove line")} ${i + 1}">×</button>
      <div class="itphoto">
        ${r.photo ? `<img class="thumb" src="${esc(r.photo)}" alt="${L("Photo de la ligne", "Line photo")} ${i + 1}"><button class="btn ghost danger" type="button" data-photo-del="${i}">${L("Retirer la photo", "Remove photo")}</button>` : ""}
        <label class="btn photobtn">📷 ${r.photo ? L("Changer la photo", "Change photo") : L("Ajouter une photo", "Add a photo")}<input type="file" accept="image/*" data-photo="${i}" hidden></label>
      </div></div>`).join("");
  };
  box.addEventListener("change", async e => {
    const t = e.target; if (t.dataset.photo == null || !t.files[0]) return;
    try {
      state.items[+t.dataset.photo].photo = await shrinkImage(t.files[0]);
      render(); changed();
    } catch (err) { toast(L("Image illisible : essayez une photo JPEG ou PNG.", "Unreadable image: try a JPEG or PNG photo.")); }
  });
  box.addEventListener("input", e => {
    const t = e.target; if (t.dataset.m == null) return;
    state.items[+t.dataset.i][t.dataset.m] = t.value; changed();
  });
  box.addEventListener("click", e => {
    const pd = e.target.closest("[data-photo-del]");
    if (pd) { delete state.items[+pd.dataset.photoDel].photo; render(); changed(); return; }
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.items.splice(+b.dataset.rm, 1);
    if (!state.items.length) state.items.push({});
    render(); changed();
  });
  host.querySelector("[data-additem]").addEventListener("click", () => {
    state.items.push({}); render(); changed();
    const last = box.querySelector(".itrow:last-child input"); if (last) { last.scrollIntoView({ block: "center", behavior: "smooth" }); last.focus({ preventScroll: true }); }
  });
  render();
}

/* règle : chaque description (ou photo) doit avoir une quantité */
function reqValidate(s) {
  const errs = [];
  (s.items || []).forEach((r, i) => {
    const hasItem = String(r.desc || "").trim() || r.photo;
    if (hasItem && !String(r.qty || "").trim())
      errs.push({ selector: `[data-i="${i}"][data-m="qty"]`, message: L(`Ligne ${i + 1} : la quantité est obligatoire.`, `Line ${i + 1}: quantity is required.`) });
  });
  return errs;
}

function reqPrint(s) {
  const items = (s.items || []).filter(r => r.desc || r.qty || r.photo);
  const minRows = items.some(r => r.photo) ? 8 : 12;
  while (items.length < minRows) items.push({});
  const img = d => d ? `<img src="${d}" alt="">` : "";
  return `<div class="r-head">
    <img src="logo.svg" alt="">
    <div class="r-addr">Flo Fab Inc.<br>860 boul. Industriel<br>Bois-des-Filion, Québec, J6Z 4V7</div>
  </div>
  <div class="r-title">${L("RÉQUISITION D'ACHAT", "PURCHASE REQUISITION")}</div>
  <div class="r-info">${line(it("Date :", s.date), it(L("# Job :", "Job # :"), s.job))}${line(it(L("Nom de l'employé :", "Employee name :"), s.sigTechName || s.tech, { f: 1.6 }), it(L("Client :", "Customer :"), s.customer))}</div>
  <table class="p r-tbl"><thead><tr><th>DESCRIPTIONS</th><th style="width:12%">${L("QUANTITÉ", "QUANTITY")}</th></tr></thead>
    <tbody>${items.map(r => `<tr><td><div class="r-desc"><span>${v(r.desc)}</span>${r.photo ? `<img src="${v(r.photo)}" alt="">` : ""}</div></td><td class="ctr">${v(r.qty)}</td></tr>`).join("")}</tbody></table>
  <div class="r-sig">
    <div class="r-sigb"><div class="r-simg">${img(s.sigEmp)}</div><div class="r-sline"><b>${L("Signature employé(e) :", "Employee signature :")}</b> ${v(s.sigTechName || s.tech)}</div></div>
    <div class="r-sigb"><div class="r-simg">${img(s.sigApp)}</div><div class="r-sline"><b>${L("Approuvé par :", "Approved by :")}</b> ${v(s.approver)}</div></div>
  </div>` + foot(s);
}

/* =====================================================================
   6. QC CONTRÔLE PROGRAMMATION — liste de contrôle qualité (fait + testé)
   ===================================================================== */
const VFD_MODES = [["open", "Boucle ouverte", "Open loop"], ["sensorless", "Sensorless curve", "Sensorless curve"], ["closed", "Boucle fermée", "Closed loop"]];
const VOLT_OPTIONS = ["460 V 60 Hz", "575 V 60 Hz", "208 V 60 Hz", "400 V 50 Hz", "230 V 50 Hz", "380 V 50 Hz", "120 V 60 Hz", "240 V 60 Hz"];
const VFD_ROWS = [
  { id: "motor", pk: "motorOk", tk: "motorTune", na: null, fr: "Données moteur entrées", en: "Motor data entered" },
  { id: "volt", pk: null, tk: "voltOk", na: null, single: true, select: "voltage", fr: "Vérifier voltage", en: "Verify voltage" },
  { id: "wire", pk: null, tk: "wireOk", na: null, single: true, fr: "Vérifier filage", en: "Verify wiring" },
  { id: "rot", pk: null, tk: "rotOk", na: null, single: true, fr: "Vérifier rotation", en: "Verify rotation" },
  { id: "cv", pk: null, tk: "cvOk", na: "cvNA", single: true, fr: "Vérifier check valve", en: "Verify check valve" },
  { id: "pid", pk: "pidProg", tk: "pidTest", na: "pidNA", pid: true, fr: "PID setup programmé", en: "PID setup programmed" },
  { id: "seq", pk: "seqProg", tk: "seqTest", na: "seqNA", fr: "Séquence lead-lag / alternance", en: "Lead-lag / alternation sequence" },
  { id: "slp", pk: "slpProg", tk: "slpTest", na: "slpNA", fr: "Sleep mode", en: "Sleep mode" },
  { id: "lp", pk: "lpProg", tk: "lpTest", na: "lpNA", fr: "Low pressure", en: "Low pressure" },
  { id: "hmi", pk: "hmiProg", tk: "hmiTest", na: "hmiNA", fr: "HMI programmé et testé", en: "HMI programmed and tested" }
];

/* état du contrôle : chaque point doit être programmé ET testé, ou sans objet */
function vfdStatus(s) {
  const rows = VFD_ROWS.map(r => {
    const autoNA = !!(r.pid && s.mode === "open");
    const na = autoNA || !!(r.na && s[r.na]);
    return { r, autoNA, na, done: na || !!((r.pk ? s[r.pk] : true) && s[r.tk] && (r.select ? s[r.select] : true)) };
  });
  const left = rows.filter(x => !x.done).length + (s.mode ? 0 : 1);
  return { rows, left, complete: left === 0, modeOk: !!s.mode };
}

function vfdHtml(p) {
  const sec = (title, inner) => `<section class="sec" aria-label="${title}"><h2 class="bar">${title}</h2>${inner}</section>`;
  const row = r => `<div class="qcrow">
      <div class="qctitle">${L(r.fr, r.en)}</div>
      <div class="duo"${r.pid ? " data-pid" : ""}>${r.single ? chk(r.tk, L("Vérifié", "Checked")) : chk(r.pk, L("Programmé", "Programmed")) + chk(r.tk, L("Testé", "Tested"))}${r.na ? chk(r.na, L("S.O.", "N/A")) : ""}</div>
      ${r.select ? `<div class="f qcsel"><label for="${p}-${r.select}">${L("Voltage", "Voltage")}</label><select id="${p}-${r.select}" data-k="${r.select}"><option value="">${L("— Choisir —", "— Choose —")}</option>${VOLT_OPTIONS.map(o => `<option value="${o}">${o}</option>`).join("")}</select></div>` : ""}
      ${r.pid ? `<div class="qcna" data-pid-na hidden>${L("Sans objet en boucle ouverte.", "Not applicable in open loop.")}</div>` : ""}
    </div>`;
  return sec(L("QC CONTRÔLE PROGRAMMATION", "QC PROGRAMMING CHECK"), `
    <div class="grid2">
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "job", L("# Job", "Job #"))}
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}${fld(p, "project", L("Projet", "Project"))}
      ${fld(p, "tech", L("Technicien", "Technician"), { auto: "name", mirror: "sigTechName" })}
    </div>`) +
  sec(L("ÉQUIPEMENT", "EQUIPMENT"), `<div data-vfds></div>
    <button class="btn addrow" type="button" data-addvfd>${L("+ Ajouter un VFD", "+ Add a VFD")}</button>
    <div class="grid2" style="border-top:1px solid var(--line)">${fld(p, "hmiModel", L("HMI — modèle", "HMI — model"))}</div>`) +
  sec(L("MODE DE CONTRÔLE", "CONTROL MODE"), `
    <div class="reasons three" role="radiogroup" aria-label="${L("Mode de contrôle", "Control mode")}">${VFD_MODES.map(([k, fr, en]) =>
      `<label class="reason"><span>${L(fr, en)}</span><input type="radio" name="${p}-mode" value="${k}" data-k="mode"></label>`).join("")}</div>`) +
  sec(L("CONTRÔLE QUALITÉ", "QUALITY CHECK"), `<div class="qcsum" data-qc-sum aria-live="polite"></div>${VFD_ROWS.map(row).join("")}`) +
  notesBlock() +
  sec("SIGNATURE", `<div class="sigcols one">
      <div class="sigcol">
        <h3>${L("Technicien", "Technician")}</h3>
        ${fld(p, "sigTechName", L("Nom", "Name"), { auto: "name" })}
        <div class="sigwrap"><div class="sigbox"><canvas data-sig="sigTech" aria-label="${L("Signature du technicien", "Technician signature")}"></canvas><div class="hint">${L("Signature du technicien", "Technician signature")}</div></div>
        <div class="sigtools"><button class="btn ghost" type="button" data-clear="sigTech">${L("Effacer", "Clear")}</button></div></div>
      </div>
    </div>`);
}

function vfdInit({ host, state, changed }) {
  // anciens brouillons : un seul VFD saisi dans les champs vfdModel / vfdSerial
  if (!Array.isArray(state.vfds) || !state.vfds.length) state.vfds = [{ model: state.vfdModel || "", serial: state.vfdSerial || "" }];
  const emptyV = r => !(r.model || r.serial);
  while (state.vfds.length > 1 && emptyV(state.vfds[state.vfds.length - 1])) state.vfds.pop();
  const box = host.querySelector("[data-vfds]");
  const render = () => {
    box.innerHTML = state.vfds.map((r, i) => `<div class="vrow">
      <b class="vt">VFD ${i + 1}</b>
      <label class="mf"><span>${L("Modèle", "Model")}</span><input data-i="${i}" data-m="model" value="${esc(r.model)}"></label>
      <label class="mf"><span>${L("N° de série", "Serial No")}</span><input data-i="${i}" data-m="serial" value="${esc(r.serial)}"></label>
      <button class="rm" type="button" data-rm="${i}" aria-label="${L("Retirer le VFD", "Remove VFD")} ${i + 1}">×</button></div>`).join("");
  };
  box.addEventListener("input", e => {
    const t = e.target; if (t.dataset.m == null) return;
    state.vfds[+t.dataset.i][t.dataset.m] = t.value; changed();
  });
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.vfds.splice(+b.dataset.rm, 1);
    if (!state.vfds.length) state.vfds.push({});
    render(); changed();
  });
  host.querySelector("[data-addvfd]").addEventListener("click", () => {
    state.vfds.push({}); render(); changed();
    const last = box.querySelector(".vrow:last-child input"); if (last) { last.scrollIntoView({ block: "center", behavior: "smooth" }); last.focus({ preventScroll: true }); }
  });
  render();
}

function vfdRefresh(host, s) {
  const st = vfdStatus(s), open = s.mode === "open";
  host.querySelectorAll("[data-pid]").forEach(e => e.hidden = open);
  host.querySelectorAll("[data-pid-na]").forEach(e => e.hidden = !open);
  VFD_ROWS.forEach(r => {                       // « S.O. » coché : les cases Programmé / Testé sont désactivées
    if (!r.na) return;
    [r.pk, r.tk].filter(Boolean).forEach(k => { const el = host.querySelector(`[data-k="${k}"]`); if (el) el.disabled = !!s[r.na]; });
  });
  const sum = host.querySelector("[data-qc-sum]");
  if (sum) {
    sum.classList.toggle("ok", st.complete);
    sum.textContent = st.complete
      ? L("✓ Contrôle complet : tous les points sont validés.", "✓ Check complete: all items are validated.")
      : L(`${st.left} point${st.left > 1 ? "s" : ""} à valider${st.modeOk ? "" : " (mode de contrôle à choisir)"}.`,
          `${st.left} item${st.left > 1 ? "s" : ""} left to validate${st.modeOk ? "" : " (choose a control mode)"}.`);
  }
}

function vfdPrint(s) {
  const st = vfdStatus(s);
  let vfdList = (Array.isArray(s.vfds) ? s.vfds : [{ model: s.vfdModel, serial: s.vfdSerial }]).filter(r => r && (r.model || r.serial));
  if (!vfdList.length) vfdList = [{}];
  const rows = st.rows.map(({ r, na, autoNA }) => `<tr><td>${L(r.fr, r.en)}${r.select ? ` — <b>${v(s[r.select]) || "…"}</b>` : ""}</td>
      <td class="ctr">${r.pk ? (na ? "" : cb(s[r.pk])) : "—"}</td><td class="ctr">${na ? "" : cb(s[r.tk])}</td>
      <td class="ctr">${r.na || r.pid ? cb(na) : "—"}${autoNA ? `<div class="v-sub">${L("boucle ouverte", "open loop")}</div>` : ""}</td></tr>`).join("");
  const img = d => d ? `<img src="${d}" alt="">` : "";
  const result = st.complete
    ? `<div class="v-result">✓ ${L("RÉSULTAT QC : CONFORME — tous les points sont validés", "QC RESULT: PASSED — all items are validated")}</div>`
    : `<div class="v-result ko">✗ ${L(`RÉSULTAT QC : INCOMPLET — ${st.left} point${st.left > 1 ? "s" : ""} à valider`, `QC RESULT: INCOMPLETE — ${st.left} item${st.left > 1 ? "s" : ""} left to validate`)}</div>`;
  return `<div class="p-head"><img src="logo.svg" alt="">
    <div class="p-addr">860 boul. Industriel<br>Bois-des-Filion, QC<br>Canada, J6Z 4V7<br>Tel : (450) 621-2995<br>Fax : (450) 621-4995</div></div>
  <div class="m-bar">${L("QC CONTRÔLE PROGRAMMATION", "QC PROGRAMMING CHECK")}</div>
  <div class="m-cols last v-info"><div class="m-col">
      ${line(it("Date :", s.date), it(L("# Job :", "Job # :"), s.job))}${line(it(L("Client :", "Customer :"), s.customer))}${line(it(L("Projet :", "Project :"), s.project))}${line(it(L("Technicien :", "Technician :"), s.tech))}
    </div><div class="m-col">
      ${vfdList.map((r, i) => line(it(`VFD ${i + 1} ${L("modèle :", "model :")}`, r.model, { f: 1.5 }), it(L("N° série :", "Serial No :"), r.serial))).join("")}
      ${line(it(L("HMI modèle :", "HMI model :"), s.hmiModel))}
    </div></div>
  <div class="m-bar">${L("MODE DE CONTRÔLE", "CONTROL MODE")}</div>
  <div class="v-modes">${VFD_MODES.map(([k, fr, en]) => ck(s.mode === k, L(fr, en))).join("")}</div>
  <div class="m-bar">${L("CONTRÔLE QUALITÉ", "QUALITY CHECK")}</div>
  <table class="p v-tbl"><colgroup><col><col style="width:16%"><col style="width:16%"><col style="width:16%"></colgroup>
    <thead><tr><th>${L("POINT À VALIDER", "ITEM TO VALIDATE")}</th><th>${L("PROGRAMMÉ", "PROGRAMMED")}</th><th>${L("TESTÉ", "TESTED")}</th><th>${L("S.O.", "N/A")}</th></tr></thead>
    <tbody>${rows}</tbody></table>
  ${result}
  ${noteBlock(s)}
  <div class="avoid"><div class="m-bar">SIGNATURE</div><div class="r-sig">
    <div class="r-sigb" style="max-width:50%"><div class="r-simg">${img(s.sigTech)}</div><div class="r-sline"><b>${L("Technicien :", "Technician :")}</b> ${v(s.sigTechName || s.tech)}</div></div>
  </div></div>` + foot(s);
}

/* =====================================================================
   7. FEUILLE D'IDENTIFICATION JOB (formulaire interne)
   Grande feuille à poser sur le travail : #Quote, Client, Projet, # Job + date et heure d'impression automatiques.
   ===================================================================== */
function identHtml(p) {
  return `
  <section class="sec" aria-label="${L("Feuille d'identification job", "Job identification sheet")}">
    <h2 class="bar">${L("FEUILLE D'IDENTIFICATION JOB", "JOB IDENTIFICATION SHEET")}</h2>
    <div class="grid2">
      ${fld(p, "quote", "#Quote")}${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}
      ${fld(p, "project", L("Projet", "Project"))}${fld(p, "job", L("# Job", "# Job"))}
    </div>
    <div class="qrprev" data-qr></div>
    <p class="mintro" style="padding:10px 14px;margin:0;border-top:1px solid var(--line)">${L(
      "La feuille s'imprime en grand format. Un champ laissé vide s'imprime en gris clair (à remplir à la main). La date et l'heure d'impression s'ajoutent automatiquement au bas de la feuille.",
      "The sheet prints in large type. An empty field prints in light grey (to fill in by hand). The print date and time are added automatically at the bottom of the sheet.")}</p>
  </section>`;
}

function identPrint(s) {
  const n = new Date(), p2 = x => String(x).padStart(2, "0");
  const stamp = `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())} ${p2(n.getHours())}:${p2(n.getMinutes())}`;
  // la taille du texte s'adapte à la longueur pour que tout tienne en largeur
  const line = (val, placeholder) => {
    const t = String(val || "").trim(), txt = t || placeholder;
    // taille calculée d'après la largeur réelle du texte (Times New Roman), pour que tout tienne sur une ligne
    const cx = identPrint.cx || (identPrint.cx = document.createElement("canvas").getContext("2d"));
    cx.font = '100px "Times New Roman", Times, serif';
    const w1 = Math.max(0.01, cx.measureText(txt).width / 100);            // largeur du texte à 1 px
    const fs = Math.floor(Math.max(14, Math.min(80, 500 / w1)));           // 500 pt de large disponibles (≈ 670 px)
    return `<div class="i-line${t ? "" : " ph"}" style="font-size:${fs}pt">${v(txt)}</div>`;
  };
  const qurl = identUrl(s), qr = qrSvg(qurl);                        // code QR vers la soumission : #Quote
  return `<div class="i-page">
    <div class="c-head"><img class="i-logo" src="logo.svg" alt="">${qr ? `<div class="c-qr">${qr}<small>${v(qurl.replace("https://", ""))}</small></div>` : ""}</div>
    <div class="i-lines">${line(s.quote, "#Quote")}${line(s.customer, L("Client", "Customer"))}${line(s.project, L("Projet", "Project"))}${line(s.job, "# Job")}</div>
    <div class="i-foot"><span>${L("Date et heure d'impression :", "Printed on:")}</span> <b>${stamp}</b> <span class="i-ver">· ${v(verLabel("ident"))}</span></div>
  </div>`;
}

/* =====================================================================
   8. TEST DE PERFORMANCE DE POMPE — ANSI/HI 14.6, Grade 2B (formulaire interne, unités US)
   Reprend la feuille Excel « Rotodynamic test pump » : mêmes formules, mêmes seuils, mêmes verdicts.
   ===================================================================== */
const todayLocal = () => { const n = new Date(); return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())}`; };
const nf = (x, d = 2) => x == null || !isFinite(x) ? "" : x.toLocaleString(LANG === "en" ? "en-CA" : "fr-CA", { minimumFractionDigits: d, maximumFractionDigits: d });
const nfd = (x, d = 2) => { const t = nf(x, d); return t === "" ? "—" : t; };
const PT_LBL = [["1 (Shutoff)", "1 (Débit nul)"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7 (Duty Point)", "7 (Point de service)"], ["8 (Overload)", "8 (Surcharge)"]];
const INS_LBL = [["Flow Meter", "Débitmètre"], ["Inlet Pressure Manometer", "Manomètre d'aspiration"], ["Discharge Pressure Manometer", "Manomètre de refoulement"],
  ["Tachymeter (Speed Sensor)", "Tachymètre (capteur de vitesse)"], ["Current Meter", "Ampèremètre"]];
/* Valeurs FIXES de la feuille Excel (cellules sans fond brun) : ne se saisissent pas dans le formulaire.
   Pour les changer (ex. instrument ré-étalonné), modifier ces tableaux sur GitHub, puis augmenter la version (VERSIONS.pump). */
const PUMP_SG = 1;                       // densité relative (eau = 1)
const PUMP_PATM = 14.696;                // pression barométrique (psia, niveau de la mer)
const PUMP_INS = [                       // registre des instruments : [fabricant / modèle, n° de série, étalonnage, échéance, précision]
  ["GE PT878", "2110243", "2026-01-15", "2027-01-15", "±0,25% of Rate"],
  ["WIKA S-20", "PT-2025-0144A", "2025-11-04", "2026-11-04", "±0,50% of Span"],
  ["WIKA S-20", "PT-2025-0144B", "2025-11-04", "2026-11-04", "±0,50% of Span"],
  ["Monarch Instrument", "TACH-2026-03B", "2026-03-22", "2027-03-22", "±0,01% of Reading"],
  ["Fluke 435-II", "PQA-2025-887C", "2027-08-19", "2028-08-19", "±0,50% of Reading"]
];
const PUMP_STEPS = [[0.52, 0], [-1.64, 0], [-3.81, 0.1], [-5.97, 0.5], [-7.27, 1.8], [-8.14, 4.2], [-9.43, 8.5]];   // essai NPSH : [P1 psig, chute visée %]
// dates d'étalonnage / d'échéance : modifiables dans le formulaire ; vides = valeurs du registre ci-dessus
const insDate = (s, i, j) => (s && s[`ins${i + 1}_${j === 2 ? "cal" : "due"}`]) || PUMP_INS[i][j];
const REVS = [["1", "2021-02-11", "Initial issue.", "M. Paquette"], ["2", "2025-10-20", "Corrected Grade 2B", "M.To"],
  ["3", "2026-08-14", "Conversion en formulaire de l'application Flo-Fab (calculs automatiques, graphiques, PDF).", "—"],
  ["3.5", "2026-08-15", "PDF toujours bilingue français / anglais (feuille imprimée, PDF du courriel et de Drive).", "—"]];

/* ----- calculs (mêmes formules que la feuille Excel) ----- */
function pumpCalc(s) {
  const n = k => num(s[k]), has = x => x != null && isFinite(x);
  const Nr = n("Nr"), SG = PUMP_SG, Ds = n("Ds"), Dd = n("Dd"), Zs = n("Zs"), Zd = n("Zd"), V = n("volts"), pf = n("pf"), em = n("effM");
  const geom = has(SG) && SG > 0 && has(Ds) && Ds > 0 && has(Dd) && Dd > 0 && has(Zs) && has(Zd);
  const vel = Q => 0.002593 * ((1 / Dd ** 4) - (1 / Ds ** 4)) * Q * Q;           // différence des hauteurs de vitesse (Q en GPM, D en po)
  const pts = [];
  for (let i = 1; i <= 8; i++) {
    const N = num(s[`r${i}_N`]), Q = num(s[`r${i}_Q`]), P1 = num(s[`r${i}_P1`]), P2 = num(s[`r${i}_P2`]), I = num(s[`r${i}_I`]);
    const o = { N, Q, P1, P2, I, tdh: null, qc: null, hc: null, pc: null, eff: null };
    if (geom && has(P1) && has(P2) && has(Q)) o.tdh = ((P2 - P1) * 2.31 / SG) + (Zd - Zs) + vel(Q);
    const ratio = has(Nr) && Nr > 0 && has(N) && N > 0 ? Nr / N : null;                 // correction de vitesse (lois d'affinité)
    if (ratio != null && has(Q)) o.qc = Q * ratio;
    if (geom && ratio != null && o.qc != null && has(P1) && has(P2)) o.hc = ((P2 - P1) * 2.31 / SG) * ratio ** 2 + (Zd - Zs) + vel(o.qc);
    if (ratio != null && has(V) && has(I) && has(pf) && has(em)) o.pc = ((Math.sqrt(3) * V * I * pf * (em / 100)) / 746) * ratio ** 3;
    if (o.pc != null && o.qc != null && o.hc != null) o.eff = o.pc > 0 ? ((o.qc * o.hc * SG) / 3960) / o.pc * 100 : 0;
    pts.push(o);
  }
  const duty = pts[6];
  // valeurs garanties et seuils Grade 2B
  const Qg = n("Qg"), Hg = n("Hg"), effG = n("effG");
  const PgAuto = has(Qg) && has(Hg) && has(SG) && SG > 0 && has(effG) && effG > 0 ? Qg * Hg * SG / 3960 / (effG / 100) : null;
  const Pg = PgAuto;                                                              // puissance garantie : calculée (Q·H·SG / 3960 / η)
  // HI 14.6 : Grade 2B = débit ±8 %, hauteur ±5 %, rendement −5 %, puissance +8 % (les deux sont évalués, au même point).
  // Pompes de 10 kW (13,41 hp) et moins : débit ±10 %, hauteur ±8 % ; la tolérance de rendement suit une formule de la norme (non appliquée ici).
  const small = has(Pg) && Pg <= 13.41;
  const tQ = small ? 0.10 : 0.08, tH = small ? 0.08 : 0.05;
  const lim = {
    small, tQ, tH,
    Qlo: has(Qg) ? Qg * (1 - tQ) : null, Qhi: has(Qg) ? Qg * (1 + tQ) : null, Hlo: has(Hg) ? Hg * (1 - tH) : null, Hhi: has(Hg) ? Hg * (1 + tH) : null,
    Pmax: has(Pg) ? Pg * 1.08 : null, Emin: has(effG) && !small ? effG * 0.95 : null, Pg, PgAuto, PorMin: has(Qg) ? Qg * 0.7 : null, PorMax: has(Qg) ? Qg * 1.2 : null
  };
  // NPSH — essai de type II (NPSH3)
  const Tw = n("Tw"), Patm = PUMP_PATM, NPSHr = n("NPSHr");
  const pvap = has(Tw) ? Math.pow(10, 8.07131 - (1730.63 / (233.426 + (Tw - 32) / 1.8))) * 0.0193368 : null;
  const qtest = has(duty.Q) ? duty.Q : null, href = duty.tdh;
  // étapes : on saisit P1 et la chute visée ; débit d'essai, P2, hauteur H, NPSHA et chute sont CALCULÉS (comme la feuille Excel)
  const steps = PUMP_STEPS.map(([P1, tg]) => {
    const Q = qtest;
    const o = { Q, P1, tgt: tg, P2: null, h: null, npsha: null, drop: null };
    if (geom && has(Q) && has(P1) && has(tg) && has(href)) {
      o.P2 = P1 + (href * (1 - tg / 100) - (Zd - Zs) - vel(Q)) * SG / 2.31;                 // pression de refoulement reconstituée
      o.h = ((o.P2 - P1) * 2.31 / SG) + (Zd - Zs) + vel(Q);
      if (href !== 0) o.drop = (href - o.h) / href * 100;
    }
    if (geom && has(Q) && has(P1) && has(Patm) && has(pvap)) o.npsha = (Patm - pvap) * 2.31 / SG + (P1 * 2.31 / SG) + Zs + 0.002593 * (1 / Ds ** 4) * Q * Q;
    return o;
  });
  // NPSH3 : interpolation linéaire entre les deux étapes consécutives qui encadrent une chute de hauteur de 3 %
  const full = steps.filter(x => x.npsha != null && x.drop != null);
  let npsh3 = null, npsh3Why = "";
  for (let i = 0; i + 1 < full.length; i++) {
    const a = full[i], b = full[i + 1];
    if (a.drop < 3 && b.drop >= 3) { npsh3 = a.npsha - ((3 - a.drop) / (b.drop - a.drop)) * (a.npsha - b.npsha); break; }
  }
  if (npsh3 == null) {
    if (full.length < 2) npsh3Why = "few";
    else if (full.every(x => x.drop < 3)) npsh3Why = "low";            // l'essai doit continuer jusqu'à une chute ≥ 3 %
    else npsh3Why = "order";
  }
  const npshStatus = npsh3 != null && has(NPSHr) ? (npsh3 <= NPSHr ? "PASS" : "FAIL") : null;
  const npshaNormal = geom && has(Patm) && has(pvap) && has(duty.P1) && has(duty.Q) ? (Patm - pvap) * 2.31 / SG + (duty.P1 * 2.31 / SG) + Zs + 0.002593 * (1 / Ds ** 4) * duty.Q * duty.Q : null;
  const margin = npshaNormal != null && has(NPSHr) ? npshaNormal - NPSHr : null;
  // verdict (point de service = point 7, valeurs corrigées)
  // courbe H(Q) corrigée : interpolation linéaire entre les points d'essai, triés par débit
  const curve = pts.filter(x => x.qc != null && x.hc != null).map(x => ({ q: x.qc, h: x.hc, e: x.eff, p: x.pc })).sort((a, b) => a.q - b.q);
  const segs = []; for (let i = 0; i + 1 < curve.length; i++) if (curve[i + 1].q > curve[i].q) segs.push([curve[i], curve[i + 1]]);
  const hAt = q => { for (const [a, b] of segs) if (q >= a.q && q <= b.q) return a.h + (b.h - a.h) * (q - a.q) / (b.q - a.q); return null; };
  const ev = { hAtQg: null, qAtHg: null, qStar: null, hStar: null, effStar: null, pStar: null };
  if (has(Qg) && has(Hg) && segs.length) {
    ev.hAtQg = hAt(Qg);                                                         // barre verticale de la croix (Q = Qg)
    const xs = [];                                                              // barre horizontale (H = Hg) : débits où la courbe coupe Hg
    for (const [a, b] of segs) if ((a.h - Hg) * (b.h - Hg) <= 0 && a.h !== b.h) xs.push(a.q + (b.q - a.q) * (Hg - a.h) / (b.h - a.h));
    if (xs.length) ev.qAtHg = xs.reduce((m, x) => Math.abs(x - Qg) < Math.abs(m - Qg) ? x : m);
    const k = Hg / Qg;                                                          // droite origine – point garanti : H = k·Q
    for (const [a, b] of segs) {
      const fa = a.h - k * a.q, fb = b.h - k * b.q;
      if (fa * fb <= 0 && fa !== fb) {
        const t = fa / (fa - fb); ev.qStar = a.q + t * (b.q - a.q); ev.hStar = a.h + t * (b.h - a.h);
        if (a.e != null && b.e != null) ev.effStar = a.e + t * (b.e - a.e);
        if (a.p != null && b.p != null) ev.pStar = a.p + t * (b.p - a.p);               // puissance lue au même point que le rendement
        break;
      }
    }
  }
  const inV = ev.hAtQg != null && lim.Hlo != null ? ev.hAtQg >= lim.Hlo && ev.hAtQg <= lim.Hhi : null;
  const inH = ev.qAtHg != null && lim.Qlo != null ? ev.qAtHg >= lim.Qlo && ev.qAtHg <= lim.Qhi : null;
  // la garantie débit / hauteur est remplie si la courbe coupe ou touche la croix (barre verticale OU horizontale)
  const fh = inV === true || inH === true ? "PASS" : (inV === false || inH === false ? "FAIL" : null);
  const effSt = small ? null : (ev.effStar != null && lim.Emin != null ? (ev.effStar >= lim.Emin ? "PASS" : "FAIL") : null);
  const powSt = small ? null : (ev.pStar != null && lim.Pmax != null ? (ev.pStar <= lim.Pmax ? "PASS" : "FAIL") : null);
  const res = v => v === true ? "PASS" : (v === false ? "FAIL" : null);
  const vd = { flow: res(inH), head: res(inV), fh, eff: effSt, pow: powSt, effPending: small ? "small" : null };
  const vals = [fh, effSt, powSt];
  vd.final = vals.includes("FAIL") ? "REJECT" : (vals.every(x => x === "PASS") ? "ACCEPT" : null);
  // registre des instruments : étalonnage valide à la date d'essai ?
  const td = String(s.date || "");
  const ins = PUMP_INS.map((r, i) => { const due = insDate(s, i, 3); return !due || !td ? null : (due >= td ? "ok" : "expired"); });
  return { _Qg: Qg, _Hg: Hg, geom, pts, duty, lim, ev, curve, pvap, qtest, href, steps, npsh3, npsh3Why, npshStatus, npshaNormal, margin, vd, ins, NPSHr };
}

/* ----- graphiques (SVG en ligne : écran, impression et PDF) ----- */
function niceMax(v, ticks = 5) {
  if (!(v > 0)) return 1;
  const raw = v / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  return { step, max: Math.ceil(v / step - 1e-9) * step };
}
function smoothPath(pts) {                                    // courbe lissée (Catmull-Rom → Bézier)
  if (pts.length < 3) return pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
// o : { w, h, title, xLabel, yLabel, y2Label, curves:[{pts,axis,color,marker,name}], marks:[{x,y,axis,color,name}], vlines:[{x,color,name}], fixed }
function svgChart(o) {
  const W = o.w, H = o.h, ml = 46, mr = o.y2Label ? 46 : 14, mt = 24, mb = 78 + (o.legendRows || 0) * 12;
  const all = [...o.curves.flatMap(c => c.pts), ...(o.marks || []), ...(o.segs || []).flatMap(g => g.parts.flatMap(([x1, y1, x2, y2]) => [[x1, y1], [x2, y2]]))];
  const xs = all.map(p => p[0] != null ? p[0] : p.x).filter(x => x != null);
  if (!xs.length) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${o.fixed ? `width="${W}" height="${H}"` : ""} role="img" aria-label="${esc(o.title)}"><rect width="${W}" height="${H}" fill="#f4f7fb" stroke="#ccd6e3"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#6b7a8c">${esc(o.title)} — ${L("données à saisir", "data to enter")}</text></svg>`;
  const xmaxRaw = Math.max(...xs, ...(o.vlines || []).map(l => l.x)), xN = niceMax(xmaxRaw * 1.04);
  const ymaxOf = ax => Math.max(...o.curves.filter(c => c.axis === ax).flatMap(c => c.pts.map(p => p[1])), ...(o.marks || []).filter(m => m.axis === ax).map(m => m.y), ...(ax === 1 ? (o.segs || []).flatMap(g => g.parts.flatMap(p => [p[1], p[3]])) : []), 0);
  const y1N = niceMax(ymaxOf(1) * 1.08 || 1), y2N = o.y2Max ? { step: o.y2Max / 5, max: o.y2Max } : niceMax(ymaxOf(2) * 1.08 || 1);
  const pw = W - ml - mr, ph = H - mt - mb;
  const X = x => ml + (x / xN.max) * pw, Y1 = y => mt + ph - (y / y1N.max) * ph, Y2 = y => mt + ph - (y / y2N.max) * ph, Yf = ax => ax === 2 ? Y2 : Y1;
  let g = `<rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" fill="#fff" stroke="#9aa8b8"/>`;
  for (let t = 0; t <= 5; t++) {
    const gy = mt + ph - (t / 5) * ph;
    g += `<line x1="${ml}" y1="${gy.toFixed(1)}" x2="${ml + pw}" y2="${gy.toFixed(1)}" stroke="#e1e7ef"/>`;
    g += `<text x="${ml - 5}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#333">${+(y1N.max * t / 5).toFixed(2)}</text>`;
    if (o.y2Label) g += `<text x="${ml + pw + 5}" y="${(gy + 3).toFixed(1)}" font-size="9" fill="#333">${+(y2N.max * t / 5).toFixed(2)}</text>`;
  }
  for (let t = 0; t * xN.step <= xN.max + 1e-9; t++) {
    const gx = X(t * xN.step);
    g += `<line x1="${gx.toFixed(1)}" y1="${mt}" x2="${gx.toFixed(1)}" y2="${mt + ph}" stroke="#eef2f7"/><text x="${gx.toFixed(1)}" y="${mt + ph + 12}" text-anchor="middle" font-size="9" fill="#333">${+(t * xN.step).toFixed(2)}</text>`;
  }
  (o.vlines || []).forEach(l => { g += `<line x1="${X(l.x).toFixed(1)}" y1="${mt}" x2="${X(l.x).toFixed(1)}" y2="${mt + ph}" stroke="${l.color}" stroke-width="1.4" stroke-dasharray="5 4"/>`; });
  (o.segs || []).forEach(sg => sg.parts.forEach(([x1, y1, x2, y2]) => { g += `<line x1="${X(x1).toFixed(1)}" y1="${Y1(y1).toFixed(1)}" x2="${X(x2).toFixed(1)}" y2="${Y1(y2).toFixed(1)}" stroke="${sg.color}" stroke-width="${sg.width || 1.6}"${sg.dash ? ` stroke-dasharray="${sg.dash}"` : ""}/>`; }));
  o.curves.forEach(c => {
    const px = c.pts.map(p => [X(p[0]), Yf(c.axis)(p[1])]);
    if (px.length > 1) g += `<path d="${smoothPath(px)}" fill="none" stroke="${c.color}" stroke-width="2"/>`;
    px.forEach(p => { g += c.marker === "square" ? `<rect x="${(p[0] - 3).toFixed(1)}" y="${(p[1] - 3).toFixed(1)}" width="6" height="6" fill="${c.color}"/>` : `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="${c.color}"/>`; });
  });
  (o.marks || []).forEach(m => { const cx = X(m.x).toFixed(1), cy = Yf(m.axis)(m.y).toFixed(1); g += `<circle cx="${cx}" cy="${cy}" r="6.5" fill="none" stroke="${m.color}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="2.6" fill="${m.color}"/>`; });
  const lg = [...o.curves.map(c => [c.color, c.name, "line"]), ...(o.marks || []).map(m => [m.color, m.name, "mark"]), ...(o.segs || []).map(g => [g.color, g.name, g.dash ? "dash" : "line"]), ...(o.vlines || []).map(l => [l.color, l.name, "dash"])];
  const cols = o.legendCols || 2, lw = pw / cols;
  lg.forEach((it, i) => {
    const lx = ml + (i % cols) * lw, ly = mt + ph + 38 + Math.floor(i / cols) * 12;
    g += it[2] === "dash" ? `<line x1="${lx}" y1="${ly - 3}" x2="${lx + 16}" y2="${ly - 3}" stroke="${it[0]}" stroke-width="1.6" stroke-dasharray="4 3"/>` : it[2] === "mark" ? `<circle cx="${lx + 8}" cy="${ly - 3}" r="4.5" fill="none" stroke="${it[0]}" stroke-width="2"/>` : `<line x1="${lx}" y1="${ly - 3}" x2="${lx + 16}" y2="${ly - 3}" stroke="${it[0]}" stroke-width="2.2"/>`;
    g += `<text x="${lx + 20}" y="${ly}" font-size="8.5" fill="#222">${esc(it[1])}</text>`;
  });
  g += `<text x="${ml + pw / 2}" y="${mt + ph + 28}" text-anchor="middle" font-size="9.5" fill="#222">${esc(o.xLabel)}</text>`;
  g += `<text transform="translate(11 ${mt + ph / 2}) rotate(-90)" text-anchor="middle" font-size="9.5" fill="${o.curves.find(c => c.axis === 1) ? o.curves.find(c => c.axis === 1).color : "#222"}">${esc(o.yLabel)}</text>`;
  if (o.y2Label) g += `<text transform="translate(${W - 8} ${mt + ph / 2}) rotate(90)" text-anchor="middle" font-size="9.5" fill="${o.curves.find(c => c.axis === 2).color}">${esc(o.y2Label)}</text>`;
  g += `<text x="${W / 2}" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="#0b3d6e">${esc(o.title)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${o.fixed ? `width="${W}" height="${H}"` : ""} font-family="Arial,Helvetica,sans-serif" role="img" aria-label="${esc(o.title)}">${g}</svg>`;
}
function pumpCharts(c, fixed) {
  const good = c.pts.filter(p => p.qc != null && p.hc != null), goodE = c.pts.filter(p => p.qc != null && p.eff != null), goodP = c.pts.filter(p => p.qc != null && p.pc != null);
  const d = c.duty, xl = L("Débit corrigé (GPM)", "Corrected flow (GPM)");
  const vl = c.lim.PorMin != null ? [{ x: c.lim.PorMin, color: "#7b8794", name: L("POR min (70 % Qg)", "POR min (70% Qg)") }, { x: c.lim.PorMax, color: "#a0522d", name: L("POR max (120 % Qg)", "POR max (120% Qg)") }] : [];
  const perf = svgChart({
    w: fixed ? 440 : 380, h: (fixed ? 312 : 332) + (BILINGUAL ? 48 : 0), fixed, legendRows: BILINGUAL ? 8 : 4, legendCols: BILINGUAL ? 1 : 2, title: L("Courbe de performance", "Performance curve"), xLabel: xl, yLabel: L("Hauteur totale (ft)", "Total head (ft)"), y2Label: L("Rendement (%)", "Efficiency (%)"), y2Max: 100,
    curves: [{ pts: good.map(p => [p.qc, p.hc]), axis: 1, color: "#0f6fcb", marker: "circle", name: L("Hauteur (points d'essai)", "Head (test points)") }, { pts: goodE.map(p => [p.qc, p.eff]), axis: 2, color: "#1f9d55", marker: "square", name: L("Rendement (points d'essai)", "Efficiency (test points)") }],
    marks: d.qc != null && d.hc != null ? [{ x: d.qc, y: d.hc, axis: 1, color: "#e11d48", name: L("Point de service", "Duty point") }, ...(d.eff != null ? [{ x: d.qc, y: d.eff, axis: 2, color: "#b45309", name: L("Point de service (rendement)", "Duty point (efficiency)") }] : [])] : [],
    vlines: vl,
    segs: c.lim.Qlo != null && c.lim.Hlo != null ? [
      { color: "#111", width: 2.2, name: L("Croix de tolérance", "Tolerance cross"), parts: [[c.lim.Qlo, num(c._Hg), c.lim.Qhi, num(c._Hg)], [num(c._Qg), c.lim.Hlo, num(c._Qg), c.lim.Hhi]] },
      { color: "#6b7a8c", width: 1.2, dash: "2 3", name: L("Droite origine – garantie", "Origin – guarantee line"), parts: [[0, 0, num(c._Qg) * 1.08, num(c._Hg) * 1.08]] }
    ] : []
  });
  const pow = svgChart({
    w: fixed ? 280 : 380, h: (fixed ? 300 : 300) + (BILINGUAL ? 108 : 0), fixed, legendRows: BILINGUAL ? 2 : 1, legendCols: BILINGUAL ? 1 : 2, title: L("Puissance absorbée", "Pump power input"), xLabel: xl, yLabel: L("Puissance (HP)", "Power (HP)"),
    curves: [{ pts: goodP.map(p => [p.qc, p.pc]), axis: 1, color: "#c0392b", marker: "circle", name: L("Puissance (points)", "Shaft power (points)") }],
    marks: d.qc != null && d.pc != null ? [{ x: d.qc, y: d.pc, axis: 1, color: "#e11d48", name: L("Point de service", "Duty point") }] : []
  });
  return { perf, pow };
}

/* ----- écran ----- */
const mfT = (label, k, extra = "") => `<label class="mf"><span>${label}</span><input data-k="${k}" autocomplete="off" ${extra}></label>`;
const mfD = (label, k) => mfT(label, k, 'inputmode="decimal"');
const mfN = (label, k) => mfT(label, k, 'inputmode="text" autocapitalize="off" spellcheck="false"');       // peut être négatif : clavier complet sur iPhone
const mfDate = (label, k) => `<label class="mf"><span>${label}</span><input type="date" data-k="${k}"></label>`;
const chipHtml = (st, kind) => st == null ? `<span class="chip">—</span>` : `<span class="chip ${st === "PASS" || st === "ACCEPT" ? "ok" : "ko"}">${pumpWord(st)}</span>`;
const pumpWord = st => ({ PASS: L("CONFORME", "PASS"), FAIL: L("NON CONFORME", "FAIL"), ACCEPT: L("ACCEPTÉ", "ACCEPT"), REJECT: L("REJETÉ", "REJECT") }[st] || "—");

function pumpHtml(p) {
  const sec = (title, inner) => `<section class="sec" aria-label="${title}"><h2 class="bar">${title}</h2>${inner}</section>`;
  const rowsTol = [["Q", L("Débit Qg", "Flow Qg"), "GPM", "qg"], ["H", L("Hauteur Hg", "Head Hg"), "ft", "hg"], ["E", L("Rendement ηg", "Efficiency ηg"), "%", "eg"], ["P", L("Puissance à l'arbre Pg", "Shaft power Pg"), "HP", "pg"]];
  return sec(L("ESSAI DE PERFORMANCE DE POMPE — GRADE 2B (ANSI/HI 14.6)", "PUMP PERFORMANCE TEST — GRADE 2B (ANSI/HI 14.6)"), `
    <p class="mintro" style="padding:10px 14px 0;margin:0">${L("Pompes rotodynamiques : essai de réception de performance hydraulique, avec registres de métrologie et de moteur. Unités US (GPM, ft, psi, HP). Confirmez l'édition / l'année de la norme HI 14.6 applicable au contrat.", "Rotodynamic pumps: hydraulic performance acceptance test with metrology and motor registries. US customary units (GPM, ft, psi, HP). Confirm the ANSI/HI 14.6 edition/year that applies to the contract.")}</p>
    <div class="grid2">
      ${fld(p, "job", L("# Job", "# Job"))}${fld(p, "project", L("Nom du projet", "Project name"))}${fld(p, "date", L("Date de l'essai", "Test date"), { type: "date" })}
      ${fld(p, "inspector", L("Inspecteur / ingénieur", "Inspector / engineer"))}${fld(p, "facility", L("Installation / lieu", "Facility / location"))}
    </div>`) +
  sec(L("INFORMATIONS SUR LA POMPE", "PUMP INFORMATION"), `<div class="grid2">
      ${fld(p, "model", L("Modèle de la pompe", "Pump model"))}${fld(p, "serial", L("N° de série de la pompe", "Pump serial number"))}
      ${fld(p, "Nr", L("Vitesse nominale Nr (rpm)", "Rated speed Nr (rpm)"), { mode: "decimal" })}${fld(p, "effG", L("Rendement garanti (%)", "Efficiency guaranteed (%)"), { mode: "decimal" })}
      ${fld(p, "Ds", L("Ø intérieur conduite aspiration Ds (po)", "Suction pipe ID Ds (in)"), { mode: "decimal" })}${fld(p, "Dd", L("Ø intérieur conduite refoulement Dd (po)", "Discharge pipe ID Dd (in)"), { mode: "decimal" })}
      ${fld(p, "Zs", L("Élévation manomètre aspiration Zs (ft)", "Suction gauge elevation Zs (ft)"), { mode: "text" })}${fld(p, "Zd", L("Élévation manomètre refoulement Zd (ft)", "Discharge gauge elevation Zd (ft)"), { mode: "text" })}
      ${fld(p, "Qg", L("Débit garanti (US GPM)", "Flow rate (US GPM)"), { mode: "decimal" })}${fld(p, "Hg", L("Hauteur totale garantie TDH (ft)", "Total dynamic head TDH (ft)"), { mode: "decimal" })}
      ${fld(p, "impDia", L("Diamètre de la roue (po)", "Impeller diameter (in)"), { mode: "decimal" })}${fld(p, "NPSHr", L("NPSH requis NPSHr (ft)", "NPSH required NPSHr (ft)"), { mode: "decimal" })}
    </div>
    <div class="fixrow"><span>${L("Densité relative SG", "Specific gravity SG")} <b>1</b> (${L("eau", "water")}) <em>${L("fixe", "fixed")}</em></span><span>${L("Puissance garantie Pg", "Guaranteed power Pg")} <b data-pc="pg_g2">—</b> HP <em>${L("calculée", "calculated")}</em></span>
    </div>`) +
  sec(L("VALEURS GARANTIES ET SEUILS DE TOLÉRANCE (GRADE 2B)", "GUARANTEED VALUES & TOLERANCE THRESHOLDS (GRADE 2B)"), `<p class="mintro" style="padding:10px 14px 0;margin:0" data-pc="mode"></p>` + rowsTol.map(([k, lab, u, d]) => `<div class="tolrow"><b>${lab}</b><span>${L("Garanti", "Guaranteed")} <b data-pc="${d}_g">—</b> ${u}</span><span>${L("Limite", "Limit")} (<span data-pc="${d}_t"></span>) <b data-pc="${d}_l">—</b> ${u}</span></div>`).join("")) +
  sec(L("INFORMATIONS SUR LE MOTEUR", "MOTOR INFORMATION"), `<div class="grid2">
      ${fld(p, "mfr", L("Fabricant du moteur", "Motor manufacturer"))}${fld(p, "mserial", L("N° de série du moteur", "Motor serial number"))}
      ${fld(p, "frame", L("Carcasse (frame)", "Frame size"))}${fld(p, "encl", L("Type d'enveloppe", "Enclosure rating"))}
      ${fld(p, "hp", L("Puissance nominale (HP)", "Nominal output power (HP)"), { mode: "decimal" })}${fld(p, "frpm", L("Vitesse pleine charge (rpm)", "Full-load speed (rpm)"), { mode: "decimal" })}
      ${fld(p, "volts", L("Tension d'alimentation (V)", "Supply voltage (V)"), { mode: "decimal" })}${fld(p, "amps", L("Courant pleine charge (A)", "Full-load current (A)"), { mode: "decimal" })}
      ${fld(p, "phase", L("Phases / fréquence (ex. 3 Ph / 60 Hz)", "Phase / frequency (e.g. 3 Ph / 60 Hz)"))}${fld(p, "sf", L("Facteur de service", "Service factor"), { mode: "decimal" })}
      ${fld(p, "effM", L("Rendement du moteur ηm (%)", "Motor efficiency ηm (%)"), { mode: "decimal" })}${fld(p, "pf", L("Facteur de puissance (PF)", "Power factor (PF)"), { mode: "decimal" })}
    </div>`) +
  sec(L("REGISTRE DES INSTRUMENTS DE MESURE", "METROLOGICAL INSTRUMENTATION REGISTRY"), `<p class="mintro" style="padding:10px 14px 0;margin:0">${L("Fabricant, n° de série et précision : fixes (registre de l'entreprise). Les dates d'étalonnage et d'échéance se modifient ; l'état d'étalonnage est vérifié à la date de l'essai.", "Manufacturer, serial number and accuracy: fixed (company registry). The calibration and due dates can be changed; the calibration status is checked against the test date.")}</p>` + INS_LBL.map(([en, fr], i) => `<div class="mrow">
      <div class="mrow-h"><b>${L(fr, en)}</b><span data-ins="${i}"></span></div>
      <div class="pout"><span>${v(PUMP_INS[i][0])}</span><span>${L("N° de série", "Serial")} <b>${v(PUMP_INS[i][1])}</b></span><span>${v(PUMP_INS[i][4])}</span></div>
      <div class="mgrid"><div class="s3">${mfDate(L("Date d'étalonnage", "Calibration date"), `ins${i + 1}_cal`)}</div><div class="s3">${mfDate(L("Échéance d'étalonnage", "Calibration due"), `ins${i + 1}_due`)}</div></div></div>`).join("")) +
  sec(L("SECTION 1 — DONNÉES BRUTES (CAPTEURS DU BANC D'ESSAI)", "SECTION 1 — RAW DATA ACQUISITION LOG (FROM TEST STAND SENSORS)"), `
    <p class="mintro" style="padding:10px 14px;margin:0">${L("Saisissez les mesures dans les cases beiges, comme dans la feuille Excel. Le TDH brut se calcule seul.", "Enter the readings in the beige cells, as in the Excel sheet. The raw TDH is calculated automatically.")}</p>
    <div class="rawwrap" role="region" aria-label="${L("Tableau des données brutes", "Raw data table")}" tabindex="0"><table class="rawt">
      <thead><tr><th>${L("Point d'essai", "Test Point")}<br><small>#</small></th><th>${L("Vitesse (Nt)", "Speed (Nt)")}<br><small>rpm</small></th><th>${L("Débit (Qt)", "Flow (Qt)")}<br><small>GPM</small></th><th>${L("Press. aspiration (P1)", "Suction Pres (P1)")}<br><small>PSI</small></th><th>${L("Press. refoulement (P2)", "Discharge Pres (P2)")}<br><small>PSI</small></th><th>${L("Courant (I)", "Current (I)")}<br><small>${L("A", "Amps")}</small></th><th>TDH (${L("brut", "raw")})<br><small>ft</small></th></tr></thead>
      <tbody>${PT_LBL.map(([en, fr], i) => { const lab = L(fr, en), n = i + 1, cell = (k, mode, name) => `<td><input data-k="r${n}_${k}" ${mode === "neg" ? 'inputmode="text" autocapitalize="off" spellcheck="false"' : 'inputmode="decimal"'} autocomplete="off" aria-label="${L("Point", "Point")} ${n} — ${name}"></td>`;
        return `<tr><th scope="row">${lab}</th>${cell("N", "", L("vitesse (rpm)", "speed (rpm)"))}${cell("Q", "", L("débit (GPM)", "flow (GPM)"))}${cell("P1", "neg", L("pression d'aspiration P1 (psi)", "suction pressure P1 (psi)"))}${cell("P2", "neg", L("pression de refoulement P2 (psi)", "discharge pressure P2 (psi)"))}${cell("I", "", L("courant (A)", "current (A)"))}<td class="calc" data-tdh="${i}">—</td></tr>`; }).join("")}</tbody>
    </table></div>`) +
  sec(L("SECTION 2 — CONVERSIONS PAR LES LOIS D'AFFINITÉ (CALCULÉES, NORMALISÉES À Nr)", "SECTION 2 — SPEED-CORRECTED AFFINITY LAW CONVERSIONS (CALCULATED, NORMALIZED TO Nr)"), `
    <p class="mintro" style="padding:10px 14px 0;margin:0">${L("Section calculée automatiquement à partir de la section 1 : rien à saisir.", "Calculated automatically from section 1: nothing to enter.")}</p>
    <div class="esum"><table class="esum-t calc2"><thead><tr><th>${L("Point", "Point")}</th><th>Qc<br><small>GPM</small></th><th>Hc<br><small>ft</small></th><th>Pc<br><small>HP</small></th><th>ηc<br><small>%</small></th></tr></thead>
      <tbody>${PT_LBL.map(([en, fr], i) => { const t = L(fr, en), m = t.match(/^([^(]*)(\(.*\))?$/); return `<tr><th scope="row">${m[1].trim()}${m[2] ? `<br><small>${m[2]}</small>` : ""}</th><td data-c2="${i}_qc">—</td><td data-c2="${i}_hc">—</td><td data-c2="${i}_pc">—</td><td data-c2="${i}_eff">—</td></tr>`; }).join("")}</tbody></table></div>`) +
  sec(L("SECTION 3 — COURBES DE PERFORMANCE ET ZONE D'EXPLOITATION PRÉFÉRÉE (POR)", "SECTION 3 — PERFORMANCE CURVE ANALYSIS (BEST EFFICIENCY & PREFERRED OPERATING ZONE)"), `
    <div class="pout" style="padding:10px 14px 0"><span>${L("Débit de référence BEP (Qg)", "Reference BEP flow (Qg)")} <b data-por="qg">—</b> GPM</span><span>POR ${L("min (70 % Qg)", "min (70% Qg)")} <b data-por="min">—</b> GPM</span><span>POR ${L("max (120 % Qg)", "max (120% Qg)")} <b data-por="max">—</b> GPM</span><span>${L("Point de service (Qc / Hc)", "Duty point (Qc / Hc)")} <b data-por="duty">—</b></span></div>
    <p class="mintro" style="padding:6px 14px 0;margin:0">${L("Un point en surcharge (au-dessus du débit garanti) est ajouté (§14.6.5.7.1). Le vrai BEP peut se situer hors de la plage d'essai.", "An overload point above the guarantee flow (§14.6.5.7.1) is included. The true best-efficiency point may lie beyond the tested range.")}</p>
    <div class="chartbox" data-chart="perf"></div><div class="chartbox" data-chart="pow"></div>`) +
  sec(L("SECTION 4 — ÉVALUATION AUTOMATIQUE GRADE 2B (MÉTHODE HI 14.6)", "SECTION 4 — AUTOMATED GRADE 2B EVALUATION (HI 14.6 METHOD)"), `
    <p class="mintro" style="padding:10px 14px 0;margin:0">${L("Méthode HI 14.6 : la garantie débit / hauteur est remplie si la courbe H-Q corrigée coupe ou touche la croix de tolérance ; le rendement se lit là où la courbe coupe la droite passant par l'origine et le point garanti. La puissance est lue au même point.", "HI 14.6 method: the flow / head guarantee is met if the corrected H-Q curve crosses or touches the tolerance cross; efficiency is read where the curve crosses the line through the origin and the guarantee point. Power is read at the same point.")}</p>
    <div class="vgrid">${[["flow", L("Débit", "Rate of flow")], ["head", L("Hauteur totale", "Total head")], ["pow", L("Puissance absorbée", "Pump power input")], ["eff", L("Rendement", "Efficiency")]].map(([k, lab]) => `<div class="vcell"><span class="vlab">${lab}</span><span data-vd="${k}"></span><span class="vlim" data-vl="${k}"></span></div>`).join("")}</div>
    <div class="npnote">${L("Débit et hauteur : la garantie est remplie si au moins l'un des deux est conforme (la courbe H-Q touche la croix de tolérance, HI 14.6). Puissance et rendement doivent être conformes.", "Rate of flow and total head: the guarantee is met if at least one of the two passes (the H-Q curve touches the tolerance cross, HI 14.6). Power input and efficiency must pass.")}</div>
    <div class="etot"><span>${L("VERDICT FINAL", "FINAL VERDICT")}</span><span data-vd="final"></span></div>
    <div class="npnote" data-vd="note"></div>`) +
  sec(L("SECTION 5 — COMMENTAIRES / REMARQUES", "SECTION 5 — COMMENTS / REMARKS"), `<p class="mintro" style="padding:10px 14px;margin:0">${L("À écrire à la main sur la feuille imprimée (lignes vierges), comme sur la feuille Excel.", "Handwritten on the printed sheet (blank lines), as on the Excel sheet.")}</p>`) +
  sec(L("SECTION 6 — SIGNATURES DES TÉMOINS", "SECTION 6 — WITNESS SIGN-OFF"), `<p class="mintro" style="padding:10px 14px 0;margin:0">${L("Signatures à la main sur la feuille imprimée ; seules les dates se saisissent.", "Signatures are handwritten on the printed sheet; only the dates are entered.")}</p>
    <div class="grid2">${[["Mfr", L("Représentant du fabricant — date", "Manufacturer rep — date")], ["Wit", L("Ingénieur témoin — date", "Witness engineer — date")], ["Tpi", L("Inspecteur tiers — date", "Third-party inspector — date")]].map(([k, lab]) => fld(p, `sig${k}Date`, lab, { type: "date" })).join("")}</div>`) +
  sec(L("SECTION 7 — HISTORIQUE DES RÉVISIONS DU DOCUMENT", "SECTION 7 — DOCUMENT REVISION HISTORY"), `<div class="esum"><table class="esum-t revt"><thead><tr><th>Rev</th><th>Date</th><th>Description</th><th>${L("Par", "By")}</th></tr></thead><tbody>${REVS.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td style="text-align:left">${v(r[2])}</td><td>${v(r[3])}</td></tr>`).join("")}</tbody></table></div>`);
}

function pumpRefresh(host, s) {
  const c = pumpCalc(s), q = sel => host.querySelector(sel), setT = (sel, t) => { const e = q(sel); if (e) e.textContent = t; }, setH = (sel, h) => { const e = q(sel); if (e) e.innerHTML = h; };
  const lim = c.lim;
  const pct = x => `±${nf(x * 100, 0)} %`;
  setT('[data-pc="mode"]', lim.small ? L("Pompe de 10 kW (13,41 hp) et moins : tolérances de la norme pour petites pompes (débit ±10 %, hauteur ±8 %). Les tolérances de rendement et de puissance se calculent avec la formule de la norme : à vérifier à la main.", "Pump of 10 kW (13.41 hp) or less: small-pump tolerances (flow ±10%, head ±8%). The efficiency and power tolerances use the standard's formula: check them by hand.")
    : L("Grade 2B : débit ±8 %, hauteur ±5 %, rendement −5 %, puissance +8 %.", "Grade 2B: flow ±8%, head ±5%, efficiency −5%, power +8%."));
  setT('[data-pc="qg_g"]', nfd(num(s.Qg), 1)); setT('[data-pc="qg_t"]', pct(lim.tQ)); setT('[data-pc="qg_l"]', lim.Qlo != null ? `${nf(lim.Qlo, 1)} – ${nf(lim.Qhi, 1)}` : "—");
  setT('[data-pc="hg_g"]', nfd(num(s.Hg), 2)); setT('[data-pc="hg_t"]', pct(lim.tH)); setT('[data-pc="hg_l"]', lim.Hlo != null ? `${nf(lim.Hlo, 2)} – ${nf(lim.Hhi, 2)}` : "—");
  setT('[data-pc="eg_g"]', nfd(num(s.effG), 2)); setT('[data-pc="eg_t"]', lim.small ? L("formule de la norme", "standard's formula") : L("min −5 %", "min −5%")); setT('[data-pc="eg_l"]', lim.Emin != null ? `≥ ${nf(lim.Emin, 2)}` : "—");
  setT('[data-pc="pg_g"]', nfd(lim.Pg, 2)); setT('[data-pc="pg_g2"]', nfd(lim.Pg, 2)); setT('[data-pc="pg_t"]', lim.small ? L("formule de la norme", "standard's formula") : L("max +8 %", "max +8%")); setT('[data-pc="pg_l"]', lim.Pmax != null && !lim.small ? `≤ ${nf(lim.Pmax, 2)}` : "—");
  c.pts.forEach((p, i) => {
    setT(`[data-tdh="${i}"]`, nfd(p.tdh));
    setT(`[data-c2="${i}_qc"]`, nfd(p.qc, 1)); setT(`[data-c2="${i}_hc"]`, nfd(p.hc)); setT(`[data-c2="${i}_pc"]`, nfd(p.pc)); setT(`[data-c2="${i}_eff"]`, nfd(p.eff));
  });
  c.ins.forEach((st, i) => setH(`[data-ins="${i}"]`, st == null ? "" : st === "ok" ? `<span class="chip ok">✓ ${L("Étalonnage valide", "Calibration valid")}</span>` : `<span class="chip ko">⚠ ${L("Étalonnage échu", "Calibration expired")}</span>`));
  setT('[data-np="pvap"]', nfd(c.pvap, 4)); setT('[data-np="qtest"]', nfd(c.qtest, 1)); setT('[data-np="href"]', nfd(c.href, 2));
  c.steps.forEach((st, j) => setH(`[data-st="${j}"]`, `<span class="calc">${L("Calculé :", "Calculated:")}</span><span>Qt <b>${nfd(st.Q, 1)}</b> GPM</span><span>P2 <b>${nfd(st.P2)}</b> psig</span><span>H <b>${nfd(st.h)}</b> ft</span><span>NPSHA <b>${nfd(st.npsha)}</b> ft</span><span>${L("Chute", "Drop")} <b>${nfd(st.drop)}</b> %</span>`));
  setT('[data-np="npsh3"]', nfd(c.npsh3)); setH('[data-np="status"]', chipHtml(c.npshStatus));
  setT('[data-np="why"]', c.npsh3 != null ? "" : ({ few: L("Saisissez au moins deux étapes complètes (P1 et P2) pour interpoler le NPSH3.", "Enter at least two complete steps (P1 and P2) to interpolate NPSH3."), low: L("Aucune étape n'atteint 3 % de chute : poursuivez l'essai (réduire encore le NPSHA) jusqu'à dépasser 3 %.", "No step reaches a 3% drop: continue the test (reduce NPSHA further) until it exceeds 3%."), order: L("Les étapes doivent se suivre par NPSHA décroissant (chute croissante) pour encadrer 3 %.", "Steps must follow in decreasing NPSHA (increasing drop) so that 3% is bracketed.") }[c.npsh3Why] || ""));
  setT('[data-np="npsha"]', nfd(c.npshaNormal)); setT('[data-np="margin"]', nfd(c.margin));
  setT('[data-np="npshr"]', nfd(c.NPSHr)); setT('[data-np="marginf"]', c.margin != null ? `= ${nf(c.npshaNormal)} − ${nf(c.NPSHr)}` : "");
  setT('[data-por="qg"]', nfd(num(s.Qg), 0)); setT('[data-por="min"]', nfd(lim.PorMin, 0)); setT('[data-por="max"]', nfd(lim.PorMax, 0));
  setT('[data-por="duty"]', c.duty.qc != null && c.duty.hc != null ? `${nf(c.duty.qc, 1)} GPM / ${nf(c.duty.hc, 2)} ft` : "—");
  const ch = pumpCharts(c, false); setH('[data-chart="perf"]', ch.perf); setH('[data-chart="pow"]', ch.pow);
  const ev = c.ev;
  setH('[data-vd="flow"]', chipHtml(c.vd.flow)); setH('[data-vd="head"]', chipHtml(c.vd.head));
  setH('[data-vd="pow"]', c.vd.effPending ? `<span class="chip">${L("À VÉRIFIER", "TO CHECK")}</span>` : chipHtml(c.vd.pow));
  setH('[data-vd="eff"]', c.vd.effPending ? `<span class="chip">${L("À VÉRIFIER", "TO CHECK")}</span>` : chipHtml(c.vd.eff));
  setT('[data-vl="flow"]', ev.qAtHg != null ? `Q(Hg) = ${nf(ev.qAtHg, 1)} GPM (${nf(lim.Qlo, 0)} – ${nf(lim.Qhi, 0)})` : L("La courbe n'atteint pas Hg dans la plage d'essai", "The curve does not reach Hg within the tested range"));
  setT('[data-vl="head"]', ev.hAtQg != null ? `H(Qg) = ${nf(ev.hAtQg, 2)} ft (${nf(lim.Hlo, 1)} – ${nf(lim.Hhi, 1)})` : L("Qg hors de la plage d'essai", "Qg outside the tested range"));
  setT('[data-vl="eff"]', ev.effStar != null ? `η = ${nf(ev.effStar, 2)} % ${L("à", "at")} Q = ${nf(ev.qStar, 1)} GPM` + (lim.Emin != null ? ` (min ${nf(lim.Emin, 2)} %)` : "") : "—");
  setT('[data-vl="pow"]', ev.pStar != null ? `P = ${nf(ev.pStar, 2)} HP ${L("à", "at")} Q = ${nf(ev.qStar, 1)} GPM` + (lim.Pmax != null && !lim.small ? ` (max ${nf(lim.Pmax, 2)} HP)` : "") : "—");
  setH('[data-vd="final"]', chipHtml(c.vd.final));
  const expired = c.ins.filter(x => x === "expired").length;
  setT('[data-vd="note"]', c.vd.final ? (expired ? L(`⚠ ${expired} instrument(s) avec étalonnage échu à la date de l'essai (information : n'entre pas dans le verdict).`, `⚠ ${expired} instrument(s) with calibration expired on the test date (information only: not part of the verdict).`) : "")
    : (c.vd.effPending ? L("Verdict en attente : pompe de 10 kW et moins, les tolérances de rendement et de puissance se vérifient à la main avec la formule de la norme.", "Verdict pending: pump of 10 kW or less, the efficiency and power tolerances are checked by hand with the standard's formula.")
      : L("Verdict en attente : il faut des points d'essai de part et d'autre du point garanti et les valeurs garanties.", "Verdict pending: test points on both sides of the guarantee point and the guaranteed values are needed.")));
}

function pumpInit({ host, state }) {
  PUMP_INS.forEach((r, i) => [["cal", 2], ["due", 3]].forEach(([k, j]) => {
    const el = host.querySelector(`[data-k="ins${i + 1}_${k}"]`);
    if (el && !state[`ins${i + 1}_${k}`]) el.value = r[j];
  }));
}

/* ----- impression / PDF ----- */
function pumpPrint(s) {
  const c = pumpCalc(s), lim = c.lim, st = x => x == null ? "" : x === "PASS" || x === "ACCEPT" ? "ok" : "ko";
  const cell = (val, d) => { const t = nf(val, d); return t === "" ? "" : t; };
  const tdp = (cls, txt) => `<td class="ctr ${cls}">${txt}</td>`;
  const img = d => d ? `<img src="${d}" alt="">` : "";
  const pl = (lab, key, u) => it(lab, s[key], u ? { u } : {});
  const ch = pumpCharts(c, true);
  const raw = c.pts.map((p, i) => `<tr><td>${v(L(PT_LBL[i][1], PT_LBL[i][0]))}</td><td class="n">${v(s[`r${i + 1}_N`])}</td><td class="n">${v(s[`r${i + 1}_Q`])}</td><td class="n">${v(s[`r${i + 1}_P1`])}</td><td class="n">${v(s[`r${i + 1}_P2`])}</td><td class="n">${v(s[`r${i + 1}_I`])}</td><td class="n">${cell(p.tdh)}</td></tr>`).join("");
  const cor = c.pts.map((p, i) => `<tr><td>${v(L(PT_LBL[i][1], PT_LBL[i][0]))}</td><td class="n">${cell(p.qc, 1)}</td><td class="n">${cell(p.hc)}</td><td class="n">${cell(p.pc)}</td><td class="n">${cell(p.eff)}</td></tr>`).join("");
  const stepsRows = PUMP_STEPS.map(([p1, tg], j) => { const k = c.steps[j]; return `<tr><td class="ctr">${j + 1}</td><td class="n">${cell(k.Q, 1)}</td><td class="n">${nf(p1, 2)}</td><td class="n">${nf(tg, 1)}</td><td class="n">${cell(k.P2)}</td><td class="n">${cell(k.h)}</td><td class="n">${cell(k.npsha)}</td><td class="n">${cell(k.drop)}</td></tr>`; }).join("");
  const ins = INS_LBL.map(([en, fr], i) => { const r = PUMP_INS[i]; return `<tr><td>${v(L(fr, en))}</td><td>${v(r[0])}</td><td>${v(r[1])}</td><td class="ctr">${v(insDate(s, i, 2))}</td><td class="ctr">${v(insDate(s, i, 3))}</td><td>${v(r[4])}</td>${c.ins[i] == null ? "<td></td>" : tdp(c.ins[i] === "ok" ? "ok" : "ko", c.ins[i] === "ok" ? "✓" : L("ÉCHU", "EXPIRED"))}</tr>`; }).join("");
  const ev = c.ev;
  const sec = (title, body) => `<div class="avoid"><div class="m-bar">${title}</div>${body}</div>`;
  // tableau étiquette | valeur, deux paires par ligne
  const kv = rows => { const out = []; for (let i = 0; i < rows.length; i += 2) out.push([rows[i], rows[i + 1]]);
    return `<table class="p t-tbl t-kv"><colgroup><col style="width:23%"><col style="width:27%"><col style="width:23%"><col style="width:27%"></colgroup><tbody>${out.map(pr => `<tr>${pr.map(r => r ? `<td class="k">${r[0]}</td><td>${r[1] == null || r[1] === "" ? "" : v(r[1])}${r[2] ? ` <span class="u">${r[2]}</span>` : ""}</td>` : "<td></td><td></td>").join("")}</tr>`).join("")}</tbody></table>`; };
  return `<div class="p-head"><img src="logo.svg" alt="">
    <div class="p-addr">860 boul. Industriel<br>Bois-des-Filion, QC<br>Canada, J6Z 4V7<br>Tel : (450) 621-2995<br>Fax : (450) 621-4995</div></div>
  <div class="avoid"><div class="e-bar"><span>${L("FEUILLE D'ESSAI DE PERFORMANCE DE POMPE", "PUMP PERFORMANCE TEST SHEET")}</span><b>GRADE 2B</b><span>ANSI/HI 14.6</span></div>
    <div class="t-note">${L("Pompes rotodynamiques : essais de réception de performance hydraulique — avec registres de métrologie et de moteur (unités US).", "Rotodynamic pumps: hydraulic performance acceptance tests — with metrology and motor registries (US customary units).")} ${L("Édition / année ANSI/HI 14.6 :", "ANSI/HI 14.6 edition/year:")} <span class="t-blank"></span></div></div>
  ${sec(L("PROJET ET IDENTIFICATION", "PROJECT & ASSET METADATA"), kv([["# Job", s.job], [L("Date de l'essai", "Test date"), s.date], [L("Projet", "Project"), s.project], [L("Inspecteur / ingénieur", "Inspector / engineer"), s.inspector], [L("Installation / lieu", "Facility / location"), s.facility]]))}
  ${sec(L("INFORMATIONS SUR LA POMPE", "PUMP INFORMATION"), kv([
      [L("Modèle", "Model"), s.model], [L("N° de série", "Serial No"), s.serial],
      [L("Vitesse nominale Nr", "Rated speed Nr"), s.Nr, "rpm"], ["SG", "1", L("(eau)", "(water)")],
      [L("Ø conduite aspiration Ds", "Suction pipe ID Ds"), s.Ds, "in"], [L("Ø conduite refoulement Dd", "Discharge pipe ID Dd"), s.Dd, "in"],
      [L("Élévation manomètre asp. Zs", "Suction gauge elev. Zs"), s.Zs, "ft"], [L("Élévation manomètre ref. Zd", "Discharge gauge elev. Zd"), s.Zd, "ft"],
      [L("Débit garanti", "Flow rate"), s.Qg, "GPM"], ["TDH", s.Hg, "ft"],
      [L("Ø roue", "Impeller Ø"), s.impDia, "in"], ["NPSHr", s.NPSHr, "ft"],
      [L("Rendement garanti", "Guaranteed efficiency"), s.effG, "%"], ["Pg", lim.Pg != null ? nf(lim.Pg, 2) : "", "HP"]]))}
  ${sec(L("VALEURS GARANTIES ET SEUILS DE TOLÉRANCE (GRADE 2B)", "GUARANTEED VALUES & TOLERANCE THRESHOLDS (GRADE 2B)"), `<table class="p t-tbl"><colgroup><col style="width:24%"><col style="width:16%"><col style="width:30%"><col style="width:30%"></colgroup>
      <thead><tr><th>${L("Paramètre", "Parameter")}</th><th>${L("Valeur garantie", "Guaranteed value")}</th><th>${L("Limite Grade 2B", "Grade 2B limit")}</th><th>${L("Plage calculée", "Calculated boundary")}</th></tr></thead>
      <tbody><tr><td>${L("Débit (Qg)", "Flow (Qg)")}</td><td class="n">${cell(num(s.Qg), 1)}</td><td>${L("Bilatéral", "Bilateral")} (±${nf(lim.tQ * 100, 0)} %)</td><td class="ctr">${lim.Qlo != null ? `${nf(lim.Qlo, 1)} ${L("à", "to")} ${nf(lim.Qhi, 1)} GPM` : ""}</td></tr>
      <tr><td>${L("Hauteur (Hg)", "Head (Hg)")}</td><td class="n">${cell(num(s.Hg), 2)}</td><td>${L("Bilatéral", "Bilateral")} (±${nf(lim.tH * 100, 0)} %)</td><td class="ctr">${lim.Hlo != null ? `${nf(lim.Hlo, 2)} ${L("à", "to")} ${nf(lim.Hhi, 2)} ft` : ""}</td></tr>
      <tr><td>${L("Rendement (ηg)", "Efficiency (ηg)")}</td><td class="n">${cell(num(s.effG), 2)}</td><td>${lim.small ? L("Formule de la norme (≤ 10 kW)", "Standard's formula (≤ 10 kW)") : L("Unilatéral (−5 %)", "Unilateral (−5%)")}</td><td class="ctr">${lim.Emin != null ? `${L("Minimum :", "Minimum:")} ${nf(lim.Emin, 2)} %` : L("à vérifier", "to check")}</td></tr>
      <tr><td>${L("Puissance à l'arbre (Pg)", "Shaft power (Pg)")}</td><td class="n">${cell(lim.Pg, 2)}</td><td>${lim.small ? L("Formule de la norme (≤ 10 kW)", "Standard's formula (≤ 10 kW)") : L("Unilatéral (+8 %)", "Unilateral (+8%)")}</td><td class="ctr">${lim.Pmax != null && !lim.small ? `${L("Maximum :", "Maximum:")} ${nf(lim.Pmax, 2)} HP` : L("à vérifier", "to check")}</td></tr></tbody></table>`)}
  ${sec(L("INFORMATIONS SUR LE MOTEUR", "MOTOR INFORMATION"), kv([
      [L("Fabricant", "Manufacturer"), s.mfr], [L("N° de série", "Serial No"), s.mserial],
      [L("Carcasse", "Frame"), s.frame], [L("Enveloppe", "Enclosure"), s.encl],
      [L("Puissance nominale", "Nominal output"), s.hp, "HP"], [L("Vitesse pleine charge", "Full-load speed"), s.frpm, "rpm"],
      [L("Tension", "Voltage"), s.volts, "V"], [L("Courant pleine charge", "Full-load current"), s.amps, "A"],
      [L("Phases / fréquence", "Phase / frequency"), s.phase], [L("Facteur de service", "Service factor"), s.sf],
      [L("Rendement moteur ηm", "Motor efficiency ηm"), s.effM, "%"], [L("Facteur de puissance", "Power factor"), s.pf]]))}
  ${sec(L("REGISTRE DES INSTRUMENTS DE MESURE", "METROLOGICAL INSTRUMENTATION REGISTRY"), `<table class="p t-tbl"><colgroup><col style="width:21%"><col style="width:17%"><col style="width:17%"><col style="width:13%"><col style="width:13%"><col style="width:12%"><col style="width:7%"></colgroup>
      <thead><tr><th>${L("Instrument", "Instrument")}</th><th>${L("Fabricant / modèle", "Manufacturer / model")}</th><th>${L("N° de série", "Serial No")}</th><th>${L("Étalonnage", "Calibration")}</th><th>${L("Échéance", "Due")}</th><th>${L("Précision", "Accuracy")}</th><th></th></tr></thead><tbody>${ins}</tbody></table>`)}
  ${sec(L("SECTION 1 — JOURNAL DES DONNÉES BRUTES (CAPTEURS DU BANC D'ESSAI)", "SECTION 1 — RAW DATA ACQUISITION LOG (FROM TEST STAND SENSORS)"), `<table class="p t-tbl"><colgroup><col style="width:19%"><col style="width:12%"><col style="width:13%"><col style="width:14%"><col style="width:14%"><col style="width:13%"><col style="width:15%"></colgroup>
      <thead><tr><th>${L("Point d'essai", "Test point")}</th><th>${L("Vitesse (Nt)", "Speed (Nt)")}<br>rpm</th><th>${L("Débit (Qt)", "Flow (Qt)")}<br>GPM</th><th>${L("Pression asp. (P1)", "Suction pres. (P1)")}<br>psi</th><th>${L("Pression ref. (P2)", "Discharge pres. (P2)")}<br>psi</th><th>${L("Courant (I)", "Current (I)")}<br>A</th><th>TDH (${L("brut", "raw")})<br>ft</th></tr></thead><tbody>${raw}</tbody></table>`)}
  ${sec(L("SECTION 2 — CONVERSIONS PAR LES LOIS D'AFFINITÉ (NORMALISÉES À Nr)", "SECTION 2 — SPEED-CORRECTED AFFINITY LAW CONVERSIONS (NORMALIZED TO Nr)"), `<table class="p t-tbl"><colgroup><col style="width:24%"><col style="width:19%"><col style="width:19%"><col style="width:19%"><col style="width:19%"></colgroup>
      <thead><tr><th>${L("Point d'essai", "Test point")}</th><th>${L("Débit corrigé (Qc)", "Corrected flow (Qc)")}<br>GPM</th><th>${L("Hauteur corrigée (Hc)", "Corrected head (Hc)")}<br>ft</th><th>${L("Puissance à l'arbre (Pc)", "Shaft power (Pc)")}<br>HP</th><th>${L("Rendement (ηc)", "Pump efficiency (ηc)")}<br>%</th></tr></thead><tbody>${cor}</tbody></table>`)}
  ${sec(L("SECTION 3 — COURBES DE PERFORMANCE ET ZONE D'EXPLOITATION PRÉFÉRÉE (POR)", "SECTION 3 — PERFORMANCE CURVE ANALYSIS (BEST EFFICIENCY & PREFERRED OPERATING ZONE)"), `
    ${kv([[L("Débit BEP de référence (Qg)", "Reference BEP flow (Qg)"), nf(num(s.Qg), 0), "GPM"], [L("POR — débit max (120 % Qg)", "POR — max flow (120% Qg)"), nf(lim.PorMax, 0), "GPM"],
      [L("POR — débit min (70 % Qg)", "POR — min flow (70% Qg)"), nf(lim.PorMin, 0), "GPM"], [L("Point de service (Qc / Hc)", "Duty point (Qc / Hc)"), c.duty.qc != null && c.duty.hc != null ? `${nf(c.duty.qc, 1)} GPM / ${nf(c.duty.hc, 2)} ft` : ""]])}

    <div class="t-charts"><div>${ch.perf}</div><div>${ch.pow}</div></div>`)}
  ${sec(L("SECTION 4 — ÉVALUATION AUTOMATIQUE GRADE 2B (MÉTHODE HI 14.6)", "SECTION 4 — AUTOMATED GRADE 2B EVALUATION (HI 14.6 METHOD)"), `<div class="t-note">${L("Méthode HI 14.6 : garantie débit / hauteur remplie si la courbe H-Q corrigée coupe ou touche la croix de tolérance ; rendement et puissance lus à l'intersection de la courbe et de la droite origine – point garanti.", "HI 14.6 method: flow / head guarantee met if the corrected H-Q curve crosses or touches the tolerance cross; efficiency and power read where the curve crosses the line through the origin and the guarantee point.")}${lim.small ? " " + L("Pompe de 10 kW et moins : tolérances des petites pompes ; rendement et puissance à vérifier avec la formule de la norme.", "Pump of 10 kW or less: small-pump tolerances; efficiency and power to check with the standard's formula.") : ""}</div>
      <table class="p t-tbl"><colgroup><col style="width:25%"><col style="width:31%"><col style="width:23%"><col style="width:21%"></colgroup>
      <thead><tr><th>${L("Critère", "Criterion")}</th><th>${L("Valeur mesurée (corrigée à Nr)", "Measured value (corrected to Nr)")}</th><th>${L("Limite", "Limit")}</th><th>${L("Résultat", "Result")}</th></tr></thead>
      <tbody><tr><td>${L("Débit", "Rate of flow")}</td><td>${ev.qAtHg != null ? `Q(Hg) = ${nf(ev.qAtHg, 1)} GPM` : ""}</td><td class="ctr">${lim.Qlo != null ? `${nf(lim.Qlo, 0)} ${L("à", "to")} ${nf(lim.Qhi, 0)} GPM` : ""}</td>${tdp(st(c.vd.flow), c.vd.flow ? pumpWord(c.vd.flow) : "—")}</tr>
      <tr><td>${L("Hauteur totale", "Total head")}</td><td>${ev.hAtQg != null ? `H(Qg) = ${nf(ev.hAtQg, 2)} ft` : ""}</td><td class="ctr">${lim.Hlo != null ? `${nf(lim.Hlo, 1)} ${L("à", "to")} ${nf(lim.Hhi, 1)} ft` : ""}</td>${tdp(st(c.vd.head), c.vd.head ? pumpWord(c.vd.head) : "—")}</tr>
      <tr><td>${L("Puissance absorbée", "Pump power input")}</td><td>${ev.pStar != null ? `P = ${nf(ev.pStar, 2)} HP ${L("à", "at")} Q = ${nf(ev.qStar, 1)} GPM` : ""}</td><td class="ctr">${lim.Pmax != null && !lim.small ? `Max ${nf(lim.Pmax, 2)} HP` : L("à vérifier", "to check")}</td>${c.vd.effPending ? tdp("", L("À VÉRIFIER", "TO CHECK")) : tdp(st(c.vd.pow), c.vd.pow ? pumpWord(c.vd.pow) : "—")}</tr>
      <tr><td>${L("Rendement", "Efficiency")}</td><td>${ev.effStar != null ? `η = ${nf(ev.effStar, 2)} % ${L("à", "at")} Q = ${nf(ev.qStar, 1)} GPM` : ""}</td><td class="ctr">${lim.Emin != null ? `Min ${nf(lim.Emin, 2)} %` : L("à vérifier", "to check")}</td>${c.vd.effPending ? tdp("", L("À VÉRIFIER", "TO CHECK")) : tdp(st(c.vd.eff), c.vd.eff ? pumpWord(c.vd.eff) : "—")}</tr>
      <tr><td colspan="4" style="font-size:7pt">${L("Débit et hauteur : garantie remplie si au moins l'un des deux est conforme (la courbe H-Q touche la croix de tolérance). Puissance et rendement doivent être conformes.", "Rate of flow and total head: guarantee met if at least one of the two passes (the H-Q curve touches the tolerance cross). Power input and efficiency must pass.")}</td></tr>
      <tr><td colspan="3"><b>${L("VERDICT FINAL", "FINAL VERDICT")}</b> — ACCEPT / REJECT</td>${tdp(st(c.vd.final), `<b>${c.vd.final ? pumpWord(c.vd.final) : L("EN ATTENTE", "PENDING")}</b>`)}</tr></tbody></table>`)}
  ${sec(L("SECTION 5 — COMMENTAIRES / REMARQUES", "SECTION 5 — COMMENTS / REMARKS"), `<div class="t-note">${L("Écarts, observations, mesures correctives ou autres remarques sur cet essai :", "Record any deviations, observations, corrective actions, or other remarks regarding this test:")}</div><div class="t-lines">${"<div></div>".repeat(5)}</div>`)}
  <div class="avoid"><div class="m-bar">${L("SECTION 6 — SIGNATURES DES TÉMOINS", "SECTION 6 — WITNESS SIGN-OFF SIGNATURE BLOCK")}</div><div class="t-sigs">${[["Mfr", L("Représentant du fabricant", "Manufacturer rep signature")], ["Wit", L("Ingénieur témoin", "Witness engineer signature")], ["Tpi", L("Inspecteur tiers", "Third party inspector signature")]].map(([k, lab]) => `<div class="t-sig"><div class="t-sigl"></div><div><b>${lab}</b></div><div>Date : <b>${v(s[`sig${k}Date`])}</b></div></div>`).join("")}</div></div>
  ${sec(L("SECTION 7 — HISTORIQUE DES RÉVISIONS DU DOCUMENT", "SECTION 7 — DOCUMENT REVISION HISTORY"), `<table class="p t-tbl"><colgroup><col style="width:7%"><col style="width:15%"><col><col style="width:18%"></colgroup><thead><tr><th>Rev</th><th>Date</th><th>Description</th><th>${L("Par", "By")}</th></tr></thead><tbody>${REVS.map(r => `<tr><td class="ctr">${r[0]}</td><td class="ctr">${r[1]}</td><td>${v(r[2])}</td><td>${v(r[3])}</td></tr>`).join("")}</tbody></table>`)}` + foot(s);
}

/* =====================================================================
   9. FEUILLE DE CONTRÔLE (formulaire interne)
   Grande feuille posée sur l'équipement : client, # job + bloc, puissance et unité (n/n),
   puis la liste de contrôle Alignement / Électrique / Programmation (cases à cocher à la main ou dans l'app).
   ===================================================================== */
const CTRL_ITEMS = [["assy", "Assemblage", "Assembly"], ["align", "Alignement", "Alignment"], ["elec", "Électrique", "Electrical"], ["prog", "Programmation", "Programming"],
  ["isol", "Isolation", "Insulation"], ["test", "Tester", "Testing"], ["fini", "Finition", "Finishing"], ["rust", "Inhibiteur de rouille", "Rust inhibitor"],
  ["loose", "Pièces shippées lousses", "Loose-shipped parts"], ["qc", "Contrôle qualité", "Quality control"]];
const CTRL_DEFAULT = ["align", "elec", "prog"];
// code QR : lien vers la soumission / le job dans l'ERP
// numéro de base du # job : le premier groupe de chiffres, avant le tiret (6 chiffres max.) — ex. 175617-16 → 175617, 64648-3 → 64648
const quoteUrl = val => { const m = String(val || "").match(/\d+/); const q = m ? m[0].slice(0, 6) : ""; return q ? "https://dev.flofab.com/Quotes/" + q + "?t=6" : ""; };
const ctrlUrl = s => quoteUrl(s.job);                                  // feuille de contrôle : # job
const identUrl = s => quoteUrl(s.quote);                               // feuille d'identification : #Quote
const qrSvg = text => {
  if (!text || typeof window.qrcode !== "function") return "";
  try {
    const q = window.qrcode(0, "M"); q.addData(text); q.make();
    const n = q.getModuleCount(), m = 4; let d = "";                       // marge de 4 modules (zone de silence)
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="QR ${esc(text)}"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  } catch (e) { return ""; }
};
// lignes à imprimer : celles cochées dans l'app (par défaut : alignement, électrique, programmation)
const CTRL_REQUIRED = ["qc"];                                       // toujours imprimée : contrôle qualité obligatoire
const ctrlSel = s => { const any = CTRL_ITEMS.some(([k]) => ("opt_" + k) in s); return CTRL_ITEMS.filter(([k]) => CTRL_REQUIRED.includes(k) || (any ? !!s["opt_" + k] : CTRL_DEFAULT.includes(k))); };
function ctrlHtml(p) {
  return `
  <section class="sec" aria-label="${L("Feuille de contrôle", "Control sheet")}">
    <h2 class="bar">${L("FEUILLE DE CONTRÔLE", "CONTROL SHEET")}</h2>
    <div class="grid2">
      ${fld(p, "job", L("# Job", "# Job"))}${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}
      ${fld(p, "block", L("Projet", "Project"))}
      ${fld(p, "unit", L("Unité n°", "Unit no."), { mode: "numeric" })}${fld(p, "units", L("Sur (nombre d'unités)", "Of (number of units)"), { mode: "numeric" })}
    </div>
    <div class="qrprev" data-qr></div>
  </section>
  <section class="sec" aria-label="${L("Liste de contrôle", "Checklist")}">
    <h2 class="bar">${L("LISTE DE CONTRÔLE — LIGNES À IMPRIMER", "CHECKLIST — LINES TO PRINT")}</h2>
    <p class="mintro" style="padding:10px 14px 0;margin:0">${L("Choisissez les lignes qui apparaîtront sur la feuille. Chacune s'imprime avec une case à cocher et une ligne pour les initiales.", "Choose the lines that will appear on the sheet. Each one prints with a box to tick and a line for initials.")}</p>
    <div class="ckl">${CTRL_ITEMS.map(([k, fr, en]) => CTRL_REQUIRED.includes(k)
      ? `<label class="chk"><input type="checkbox" checked disabled><span>${L(fr, en)} <em class="req">${L("obligatoire", "required")}</em></span></label>`
      : `<label class="chk"><input type="checkbox" data-k="opt_${k}"><span>${L(fr, en)}</span></label>`).join("")}</div>
    <p class="mintro" style="padding:10px 14px;margin:0;border-top:1px solid var(--line)">${L(
      "La feuille s'imprime en grand format ; les cases et les initiales se remplissent à la main sur la feuille. La date, l'heure et la version s'ajoutent au bas de la feuille.",
      "The sheet prints in large type; boxes and initials are filled in by hand on the sheet. The date, time and version are added at the bottom of the sheet.")}</p>
  </section>`;
}
function qrRefresh(urlFn, fieldFr, fieldEn) {
  return (host, s) => {
    const box = host.querySelector("[data-qr]"); if (!box) return;
    const url = urlFn(s), qr = qrSvg(url);
    if (url && !qr) { box.innerHTML = `<div><b>⚠ ${L("Code QR indisponible", "QR code unavailable")}</b><span>${L("Le générateur de code QR n'a pas pu démarrer : rechargez la page (Ctrl+F5).", "The QR generator could not start: reload the page (Ctrl+F5).")}</span><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></div>`; return; }
    box.innerHTML = url ? `${qr}<div><b>${L("Code QR de la feuille", "Sheet QR code")}</b><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a><span>${L("Scanner pour ouvrir la soumission dans l'ERP (dev.flofab.com).", "Scan to open the quote in the ERP (dev.flofab.com).")}</span></div>`
      : `<div><b>${L("Code QR de la feuille", "Sheet QR code")}</b><span>${L(`Entrez le ${fieldFr} : le code QR (lien dev.flofab.com/Quotes/…) s'imprimera en haut à droite.`, `Enter the ${fieldEn}: the QR code (link dev.flofab.com/Quotes/…) will print at the top right.`)}</span></div>`;
  };
}
const ctrlRefresh = qrRefresh(ctrlUrl, "# job", "# job");
const identRefresh = qrRefresh(identUrl, "#Quote", "#Quote");
function ctrlPrint(s) {
  const stamp = stampNow();
  // taille du nom du client calculée d'après sa largeur réelle, pour qu'il tienne sur une ligne
  const cx = ctrlPrint.cx || (ctrlPrint.cx = document.createElement("canvas").getContext("2d"));
  const fit = (txt, max, avail) => { cx.font = '900 100px "Arial Black", Arial, Helvetica, sans-serif'; const w1 = Math.max(0.01, cx.measureText(txt).width / 100); return Math.floor(Math.max(18, Math.min(max, avail / w1))); };
  const client = String(s.customer || "").trim() || L("CLIENT", "CUSTOMER");
  const jobT = String(s.job || "").trim() || "# JOB", proj = String(s.block || "").trim() || L("PROJET", "PROJECT");
  const u = String(s.unit || "").trim(), n = String(s.units || "").trim();
  const l3 = u || n ? `${u || "_"}/${n || "_"}` : "_/_";
  const ph = (val, txt) => val ? "" : " ph";
  const items = ctrlSel(s), nI = items.length;                     // plus il y a de lignes, plus le texte est compact
  const itemPt = nI <= 3 ? 34 : nI <= 5 ? 30 : 26, rowGap = nI <= 3 ? 34 : nI <= 5 ? 24 : 14, big = nI <= 3 ? 80 : nI <= 5 ? 72 : 64;
  const bigSz = fit(jobT, big, 520);                                         // # job : en grand
  const midMax = nI <= 5 ? 44 : 40;                                          // client, projet, unité / sur : même grosseur
  const midSz = Math.min(fit(client, midMax, 520), fit(proj, midMax, 520), fit(l3, midMax, 520));
  const url = ctrlUrl(s), qr = qrSvg(url);
  return `<div class="c-page">
    <div class="c-head"><img class="i-logo" src="logo.svg" alt="">${qr ? `<div class="c-qr">${qr}<small>${v(url.replace("https://", ""))}</small></div>` : ""}</div>
    <div class="c-lines">
      <div class="c-client${ph(s.job)}" style="font-size:${bigSz}pt">${v(jobT.toUpperCase())}</div>
      <div class="c-l2${ph(s.customer)}" style="font-size:${midSz}pt">${v(client.toUpperCase())}</div>
      <div class="c-l2${ph(s.block)}" style="font-size:${midSz}pt">${v(proj.toUpperCase())}</div>
      <div class="c-l3${ph(u || n)}" style="font-size:${midSz}pt">${v(l3.toUpperCase())}</div>
      ${items.length ? `<div class="c-list" style="font-size:${itemPt}pt;row-gap:${rowGap}px">${items.map(([k, fr, en]) => `<span class="c-lab">${v(L(fr, en))}</span><span class="c-box"></span><span class="c-init"><small>${L("Init.", "Init.")}</small><i></i></span>`).join("")}</div>` : ""}
    </div>
    <div class="i-foot"><span>${L("Date et heure d'impression :", "Printed on:")}</span> <b>${stamp}</b> <span class="i-ver">· ${v(verLabel("ctrl"))}${s.id ? ` · ${L("Réf.", "Ref.")} ${v(s.id)}` : ""}</span></div>
  </div>`;
}

/* ---------- versions des formulaires ----------
   À AUGMENTER à chaque modification d'un formulaire (champs, libellés, mise en page) : le numéro s'imprime sur chaque PDF.
   Format : [version, date de révision]. */
const VERSIONS = {
  service: ["1.0", "2026-10-03"],
  sub:     ["1.0", "2026-10-03"],
  sur:     ["1.0", "2026-10-03"],
  est:     ["1.0", "2026-10-03"],
  req:     ["1.0", "2026-10-03"],
  vfd:     ["1.0", "2026-10-03"],
  ident:   ["1.3", "2026-10-17"],
  pump:    ["3.5", "2026-08-15"],
  ctrl:    ["2.5", "2026-10-17"]
};

/* ---------- registre ---------- */
const FORMS = {
  service: {
    group: "call", folder: "Rapports de service", fileTag: "Service",
    get title() { return L("Rapport de service", "Service call report"); },
    get desc() { return L("Appel de service, réparation, entretien, inspection.", "Service call, repair, maintenance, inspection."); },
    html: serviceHtml, init: serviceInit, print: servicePrint,
    blank: () => ({ parts: [{}] }),
    label: s => [s.customer, s.job && L("job ", "job ") + s.job].filter(Boolean).join(" — ")
  },
  sub: {
    group: "call", folder: "Mise en marche - Submersible", fileTag: "MEM-Submersible",
    get title() { return L("Mise en marche — Submersible", "Start-up — Submersible"); },
    get desc() { return L("Pompes, contrôleur, vérifications et mesures.", "Pumps, controller, checks and readings."); },
    html: subHtml, print: subPrint, pumps: true,
    blank: () => ({ page: "1", pages: "1", pumpCount: 1 }),
    label: s => [s.customer || s.project, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  },
  est: {
    group: "internal", folder: "Estimations", fileTag: "Estimation",
    get title() { return L("Estimation (soumission)", "Estimate (quote)"); },
    get desc() { return L("Matériel, main-d'œuvre, coût et prix de vente.", "Material, labour, cost and sell price."); },
    html: estHtml, init: estInit, refresh: estRefresh, print: estPrint,
    blank: () => ({ currency: "CAD", mat: [{}] }),
    label: s => [s.customer || s.project, s.quote && L("Soum. ", "Quote ") + s.quote].filter(Boolean).join(" — ")
  },
  vfd: {
    group: "internal", folder: "QC contrôle programmation", fileTag: "QC-Programmation",
    get title() { return L("QC contrôle programmation", "QC programming check"); },
    get short() { return L("QC programmation", "Programming QC"); },
    get desc() { return L("Contrôle qualité : programmé et testé (moteur, PID, lead-lag, sleep, low pressure, HMI).", "Quality check: programmed and tested (motor, PID, lead-lag, sleep, low pressure, HMI)."); },
    html: vfdHtml, init: vfdInit, refresh: vfdRefresh, print: vfdPrint,
    blank: () => ({}),
    label: s => [s.customer || s.project, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  },
  ident: {
    group: "internal", folder: "Feuilles d'identification job", fileTag: "Identification-Job",
    get title() { return L("Feuille d'identification job", "Job identification sheet"); },
    get short() { return L("Identification job", "Job ID sheet"); },
    get desc() { return L("Grande feuille #Quote, client, projet, # Job avec date et heure d'impression.", "Large sheet: #Quote, customer, project, # Job, with print date and time."); },
    html: identHtml, refresh: identRefresh, print: identPrint,
    blank: () => ({}),
    label: s => [s.customer || s.project, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  },
  pump: {
    group: "internal", folder: "Tests de pompe", fileTag: "Test-Pompe",
    get title() { return L("Test de performance de pompe (HI 14.6)", "Pump performance test (HI 14.6)"); },
    get short() { return L("Test de pompe", "Pump test"); },
    get desc() { return L("Essai hydraulique Grade 2B (ANSI/HI 14.6) : points d'essai, NPSH3, courbes et verdict ACCEPTÉ / REJETÉ.", "Grade 2B hydraulic test (ANSI/HI 14.6): test points, NPSH3, curves and ACCEPT / REJECT verdict."); },
    html: pumpHtml, init: pumpInit, refresh: pumpRefresh, print: pumpPrint,
    blank: () => ({ sigMfrDate: todayLocal(), sigWitDate: todayLocal(), sigTpiDate: todayLocal() }),
    label: s => [s.project || s.facility, s.job && "Job " + s.job, s.model && (s.model + (s.serial ? " / " + s.serial : ""))].filter(Boolean).join(" — ")
  },
  ctrl: {
    group: "internal", folder: "Feuilles de contrôle", fileTag: "Controle",
    get title() { return L("Feuille de contrôle", "Control sheet"); },
    get short() { return L("Feuille de contrôle", "Control sheet"); },
    get desc() { return L("Grande feuille : # job, client, projet, unité, et lignes de contrôle avec initiales.", "Large sheet: # job, customer, project, unit, and checklist lines with initials."); },
    html: ctrlHtml, refresh: ctrlRefresh, print: ctrlPrint,
    blank: () => Object.fromEntries(CTRL_ITEMS.map(([k]) => ["opt_" + k, CTRL_DEFAULT.includes(k)])),
    label: s => [s.customer, s.job && "Job " + s.job, s.block].filter(Boolean).join(" — ")
  },
  req: {
    group: "internal", folder: "Réquisitions d'achat", fileTag: "Requisition",
    get title() { return L("Réquisition d'achat", "Purchase requisition"); },
    get desc() { return L("Articles à acheter, quantités et approbation.", "Items to purchase, quantities and approval."); },
    html: reqHtml, init: reqInit, print: reqPrint, validate: reqValidate, landscape: true,
    blank: () => ({ items: [{}] }),
    label: s => [s.customer, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  },
  sur: {
    group: "call", folder: "Mise en marche - Surpresseur", fileTag: "MEM-Surpresseur",
    get title() { return L("Mise en marche — Surpresseur", "Start-up — Booster"); },
    get desc() { return L("Pompes, pressions, vérifications et mesures.", "Pumps, pressures, checks and readings."); },
    html: surHtml, print: surPrint, pumps: true,
    blank: () => ({ page: "1", pages: "1", pumpCount: 1 }),
    label: s => [s.customer || s.project, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  }
};

Object.entries(FORMS).forEach(([t, d]) => {
  d.version = VERSIONS[t][0]; d.revised = VERSIONS[t][1]; d.id = t;
  const orig = d.print;
  d.print = function (s) { PRINT_TYPE = t; try { return d.bilingualPdf ? bilingual(() => orig.call(this, s)) : orig.call(this, s); } finally { PRINT_TYPE = null; } };
});
FORMS.ident.ownStamp = true;
FORMS.ctrl.ownStamp = true;                  // la feuille de contrôle a sa propre ligne date / heure / version
FORMS.pump.bilingualPdf = true;              // le PDF du Test de pompe est toujours en français ET en anglais                   // la feuille a déjà sa propre ligne date / heure / version

/* signature du contenu d'un rapport (ignore les champs de suivi) : sert à savoir s'il a changé depuis l'impression / l'envoi */
function contentKey(s) {
  const c = Object.assign({}, s);
  ["printedAt", "emailedAt", "sentKey", "updated", "created", "id", "drive"].forEach(k => delete c[k]);
  const o = {}; Object.keys(c).sort().forEach(k => o[k] = c[k]);
  return JSON.stringify(o);
}

/* formulaires internes : jamais rangés sur Google Drive (courriel ou impression seulement) */
/* tous les formulaires sont enregistrés sur Google Drive, SAUF la feuille d'identification job (courriel ou impression seulement) */
const NO_DRIVE = ["ident"];
const storesOnDrive = t => !!FORMS[t] && !NO_DRIVE.includes(t);

window.Flo = { FORMS, esc, times, fmt, L, contentKey, stampText, stampNow, verLabel, storesOnDrive, pumpCalc, bilingual, setLang: l => { LANG = l === "en" ? "en" : "fr"; }, getLang: () => LANG };
})();
