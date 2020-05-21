exports.diayNoche = function (hook_name, args, cb) {
  // The client-side hook aceSetAuthorStyle works for this because all iframes are ready for manipulation

  // Set your location in settings.json. It will be used to determine the elevation of the sun at current time.
  // Use NOAA convention - for Latitude: North is negative, South is positive, Longitude: West is positive, East is negative. Examples:

  // For Mexico City:
  // ,"ep_solar": {
  //  "lat": 19.43,
  //  "lon": 99.13
  // }
  //
  // For Sydney:
  // ,"ep_solar": {
  //  "lat": -34.87,
  //  "lon": -151.2
  // }

  if (clientVars.lat) {
    // Our settings are good

    var latitude = clientVars.lat;
    var longitude = clientVars.lon;

    // Change settings here for night and day combinations. Use http://youretherpad:9001/p/test#skinvariantsbuilder to check the various combinations

    var nightColors = {
      toolbar: 'dark',
      background: 'super-dark',
      editor: 'dark',
    };
    var dayColors = {
      toolbar: 'super-light',
      background: 'light',
      editor: 'super-light',
    };

    // Define what elevation counts as "daylight". Civil twilight/dawn occurs when the elevation of the sun is above -6, Nautical is above -12, Astronomical above -18
    // See https://www.timeanddate.com/astronomy/different-types-twilight.html

    var dayElevation = -6; // Civil

    ////////////////////////////////////////////////

    elevation = solarElevation(latitude, longitude);

    luz = elevation > dayElevation ? 'day' : 'night';

    if (luz === 'day') {
      var colorm = dayColors;
    } else {
      var colorm = nightColors;
    }

    var containers = ['editor', 'background', 'toolbar'];
    var colors = ['super-light', 'light', 'dark', 'super-dark'];

    updateSkinTimeDay();

    function updateSkinTimeDay() {
      var domsToUpdate = [
        $('html'),
        $('iframe[name=ace_outer]').contents().find('html'),
        $('iframe[name=ace_outer]')
          .contents()
          .find('iframe[name=ace_inner]')
          .contents()
          .find('html'),
      ];
      colors.forEach(function (color) {
        containers.forEach(function (container) {
          domsToUpdate.forEach(function (el) {
            el.removeClass(color + '-' + container);
          });
        });
      });

      var new_classes = [];
      containers.forEach(function (container) {
        new_classes.push(colorm[container] + '-' + container);
      });

      domsToUpdate.forEach(function (el) {
        el.addClass(new_classes.join(' '));
      });
    }
  }
};

// Adapted from https://www.esrl.noaa.gov/gmd/grad/solcalc/azel.html
// by mir 2020-05-05

function solarElevation(latitude, longitude, date = new Date()) {
  if (latitude >= -90 && latitude < -89.8) {
    latitude = -89.8;
  }
  if (latitude <= 90 && latitude > 89.8) {
    latitude = 89.8;
  }

  //*****	Get calc date/time
  var zone = date.getTimezoneOffset();
  var ss = date.getSeconds();
  var mm = date.getMinutes();
  var hh = date.getHours();
  var dd = date.getDate();
  var mo = date.getMonth();
  var yy = date.getFullYear();

  while (hh > 23) {
    hh -= 24;
  }

  // timenow is GMT time for calculation

  timenow = hh + mm / 60 + ss / 3600;

  var JD = calcJD(yy, mo + 1, dd);
  var dow = calcDayOfWeek(JD);
  var doy = calcDayOfYear(mo + 1, dd, isLeapYear(yy));
  var T = calcTimeJulianCent(JD + timenow / 24.0);
  var R = calcSunRadVector(T);
  var alpha = calcSunRtAscension(T);
  var theta = calcSunDeclination(T);
  var Etime = calcEquationOfTime(T);

  var eqTime = Etime;
  var solarDec = theta; // in degrees
  var earthRadVec = R;

  eqTime = Math.floor(100 * eqTime) / 100;
  solarDec = Math.floor(100 * solarDec) / 100;

  var solarTimeFix = eqTime - 4.0 * longitude + zone;
  var trueSolarTime = hh * 60.0 + mm + ss / 60.0 + solarTimeFix;
  // in minutes

  while (trueSolarTime > 1440) {
    trueSolarTime -= 1440;
  }

  var hourAngle = trueSolarTime / 4.0 - 180.0;

  if (hourAngle < -180) {
    hourAngle += 360.0;
  }

  var haRad = degToRad(hourAngle);

  var csz =
    Math.sin(degToRad(latitude)) * Math.sin(degToRad(solarDec)) +
    Math.cos(degToRad(latitude)) *
      Math.cos(degToRad(solarDec)) *
      Math.cos(haRad);

  if (csz > 1.0) {
    csz = 1.0;
  } else if (csz < -1.0) {
    csz = -1.0;
  }
  var zenith = radToDeg(Math.acos(csz));

  var azDenom = Math.cos(degToRad(latitude)) * Math.sin(degToRad(zenith));
  if (Math.abs(azDenom) > 0.001) {
    azRad =
      (Math.sin(degToRad(latitude)) * Math.cos(degToRad(zenith)) -
        Math.sin(degToRad(solarDec))) /
      azDenom;
    if (Math.abs(azRad) > 1.0) {
      if (azRad < 0) {
        azRad = -1.0;
      } else {
        azRad = 1.0;
      }
    }

    var azimuth = 180.0 - radToDeg(Math.acos(azRad));

    if (hourAngle > 0.0) {
      azimuth = -azimuth;
    }
  } else {
    if (latitude > 0.0) {
      azimuth = 180.0;
    } else {
      azimuth = 0.0;
    }
  }
  if (azimuth < 0.0) {
    azimuth += 360.0;
  }

  exoatmElevation = 90.0 - zenith;
  if (exoatmElevation > 85.0) {
    refractionCorrection = 0.0;
  } else {
    te = Math.tan(degToRad(exoatmElevation));
    if (exoatmElevation > 5.0) {
      refractionCorrection =
        58.1 / te - 0.07 / (te * te * te) + 0.000086 / (te * te * te * te * te);
    } else if (exoatmElevation > -0.575) {
      refractionCorrection =
        1735.0 +
        exoatmElevation *
          (-518.2 +
            exoatmElevation *
              (103.4 + exoatmElevation * (-12.79 + exoatmElevation * 0.711)));
    } else {
      refractionCorrection = -20.774 / te;
    }
    refractionCorrection = refractionCorrection / 3600.0;
  }

  solarZen = zenith - refractionCorrection;

  //if(solarZen < 108.0) { // astronomical twilight
  azimuth = Math.floor(100 * azimuth) / 100;
  elevation = Math.floor(100 * (90.0 - solarZen)) / 100;
  if (solarZen < 90.0) {
    coszen = Math.floor(10000.0 * Math.cos(degToRad(solarZen))) / 10000.0;
  } else {
    coszen = 0.0;
  }

  return elevation;
  // } else {  // do not report az & el after astro twilight
  // azimuth = "dark";
  // elevation = "dark";
  // coszen = 0.0;
  // }
}

function isLeapYear(yr) {
  return (yr % 4 == 0 && yr % 100 != 0) || yr % 400 == 0;
}

function radToDeg(angleRad) {
  return (180.0 * angleRad) / Math.PI;
}

function degToRad(angleDeg) {
  return (Math.PI * angleDeg) / 180.0;
}

function calcDayOfYear(mn, dy, lpyr) {
  var k = lpyr ? 1 : 2;
  var doy =
    Math.floor((275 * mn) / 9) - k * Math.floor((mn + 9) / 12) + dy - 30;
  return doy;
}

function calcDayOfWeek(juld) {
  var A = (juld + 1.5) % 7;
  var DOW =
    A == 0
      ? 'Sunday'
      : A == 1
      ? 'Monday'
      : A == 2
      ? 'Tuesday'
      : A == 3
      ? 'Wednesday'
      : A == 4
      ? 'Thursday'
      : A == 5
      ? 'Friday'
      : 'Saturday';
  return DOW;
}

function calcJD(year, month, day) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  var A = Math.floor(year / 100);
  var B = 2 - A + Math.floor(A / 4);

  var JD =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5;
  return JD;
}

function calcTimeJulianCent(jd) {
  var T = (jd - 2451545.0) / 36525.0;
  return T;
}

function calcGeomMeanLongSun(t) {
  var L0 = 280.46646 + t * (36000.76983 + 0.0003032 * t);
  while (L0 > 360.0) {
    L0 -= 360.0;
  }
  while (L0 < 0.0) {
    L0 += 360.0;
  }
  return L0; // in degrees
}

function calcGeomMeanAnomalySun(t) {
  var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  return M; // in degrees
}

function calcEccentricityEarthOrbit(t) {
  var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  return e; // unitless
}

function calcSunEqOfCenter(t) {
  var m = calcGeomMeanAnomalySun(t);

  var mrad = degToRad(m);
  var sinm = Math.sin(mrad);
  var sin2m = Math.sin(mrad + mrad);
  var sin3m = Math.sin(mrad + mrad + mrad);

  var C =
    sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sin2m * (0.019993 - 0.000101 * t) +
    sin3m * 0.000289;
  return C; // in degrees
}

function calcSunTrueLong(t) {
  var l0 = calcGeomMeanLongSun(t);
  var c = calcSunEqOfCenter(t);

  var O = l0 + c;
  return O; // in degrees
}

function calcSunTrueAnomaly(t) {
  var m = calcGeomMeanAnomalySun(t);
  var c = calcSunEqOfCenter(t);

  var v = m + c;
  return v; // in degrees
}

function calcSunRadVector(t) {
  var v = calcSunTrueAnomaly(t);
  var e = calcEccentricityEarthOrbit(t);

  var R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(degToRad(v)));
  return R; // in AUs
}

function calcSunApparentLong(t) {
  var o = calcSunTrueLong(t);

  var omega = 125.04 - 1934.136 * t;
  var lambda = o - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
  return lambda; // in degrees
}

function calcMeanObliquityOfEcliptic(t) {
  var seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
  var e0 = 23.0 + (26.0 + seconds / 60.0) / 60.0;
  return e0; // in degrees
}

function calcObliquityCorrection(t) {
  var e0 = calcMeanObliquityOfEcliptic(t);

  var omega = 125.04 - 1934.136 * t;
  var e = e0 + 0.00256 * Math.cos(degToRad(omega));
  return e; // in degrees
}

function calcSunRtAscension(t) {
  var e = calcObliquityCorrection(t);
  var lambda = calcSunApparentLong(t);

  var tananum = Math.cos(degToRad(e)) * Math.sin(degToRad(lambda));
  var tanadenom = Math.cos(degToRad(lambda));
  var alpha = radToDeg(Math.atan2(tananum, tanadenom));
  return alpha; // in degrees
}

function calcSunDeclination(t) {
  var e = calcObliquityCorrection(t);
  var lambda = calcSunApparentLong(t);

  var sint = Math.sin(degToRad(e)) * Math.sin(degToRad(lambda));
  var theta = radToDeg(Math.asin(sint));
  return theta; // in degrees
}

function calcEquationOfTime(t) {
  var epsilon = calcObliquityCorrection(t);
  var l0 = calcGeomMeanLongSun(t);
  var e = calcEccentricityEarthOrbit(t);
  var m = calcGeomMeanAnomalySun(t);

  var y = Math.tan(degToRad(epsilon) / 2.0);
  y *= y;

  var sin2l0 = Math.sin(2.0 * degToRad(l0));
  var sinm = Math.sin(degToRad(m));
  var cos2l0 = Math.cos(2.0 * degToRad(l0));
  var sin4l0 = Math.sin(4.0 * degToRad(l0));
  var sin2m = Math.sin(2.0 * degToRad(m));

  var Etime =
    y * sin2l0 -
    2.0 * e * sinm +
    4.0 * e * y * sinm * cos2l0 -
    0.5 * y * y * sin4l0 -
    1.25 * e * e * sin2m;

  return radToDeg(Etime) * 4.0; // in minutes of time
}
