# TI-89 Emulator

Try it live at [ti89.updike.org](https://ti89.updike.org).

This is a tweaked version of ti89-simulator.com, which is a mirror of ti89-simulator.org (defunct). (Note that neither of these were simulators and this is a misnomer; the hardware is emulated in JavaScript, but the software is just [the original ROM](https://compuserve-rocks.github.io/Kings-diary/TI68k-emulator-versionJS/ti89rom.js).)

## Hack on it Yourself

This repo can be cloned to run on your own server or on your own machine, but it needs a ROM, which is not available in this repo (see the aforementioned link). The ROM should be put in the `/rom/` folder and called `ti89rom.js`.

To run things locally, you may need to launch a web server. For example, in Python 3 you can run `serve.sh` which is just

    python3 -m http.server 9123

and you can open the app in your browser at `localhost:9123` or any port number of your choosing. (The web app is client-side-only software and does not require Python and is just a folder full of static file assets, but you may run into a problem if you try to open `index.html` in your browser without the use of a web-server because of Cross-Original XmlHttpRequest restrictions.)

## GNU GPL License

This entire repo, and all of my changes are made available under the [GNU GPL](https://www.gnu.org/licenses/gpl-3.0.en.html).

## Original Copyright Information

TI-89 responsive fork of JavaScript TI-68k (89, 92+, V200, 89T) graphing calculator emulator.

Open-source PedroM instead of the official TI system software is used in this calculator. This fork continues with the GNU License of the original project. The PedroM source is available at [tiplanet.org](https://tiplanet.org/emu68k_fork/).

Credit for JavaScript TI-68k emulator goes to:

* Copyright &copy; 2011-2013 Patrick "PatrickD" Davidson (v1-v11): [http://www.ocf.berkeley.edu/~pad/emu/](http://www.ocf.berkeley.edu/~pad/emu/)
* Copyright &copy; 2012-2014 Lionel Debroux (v11-v12): [https://tiplanet.org/emu68k_fork/](https://tiplanet.org/emu68k_fork/)
* Copyright &copy; 2012-2013 Xavier "critor" Andréani
* Copyright &copy; 2012-2013 Adrien "Adriweb" Bertrand
* Copyright &copy; 2019 Emmanuel "Acksop" Roy: [https://github.com/Acksop](https://github.com/Acksop)

(Presumably Acksop did the amazing original UI (SVG) work that makes this app really sing.)

## Tweaks &amp; Improvements

Copyright &copy; 2021 Jared Updike

* I made it easy to download as a repo on Github.
* I fixed the aspect ratio of the screen so the pixels are square, and removed tons of ugly decorative dead space around the screen, to make the whole app work better on smaller screens (mobile phones).
* I fixed the canvas screen rendering (image-rendering: pixelated) to keep the blocky two-decades-old LCD text as crisp and sharp as possible.
* I made an apple-touch-precomposed-icon and added the apple-mobile-web-app-capable meta tag so the web page can be added to your iPhone's home screen as a shortcut and it will launch full screen, which allows better use of screen real estate.
* Other minor tweaks and fixes.
