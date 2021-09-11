/**
 * JavaScript TI-68k (89, 92+, V200, 89T) graphing calculator emulator
 *
 * Copyright (C) 2011-2013 Patrick "PatrickD" Davidson (v1-v11) - http://www.ocf.berkeley.edu/~pad/emu/
 * Copyright (C) 2012-2014 Lionel Debroux (v11-v12) - http://tiplanet.org
 * Copyright (C) 2012-2013 Xavier "critor" Andr�ani
 * Copyright (C) 2012-2013 Adrien "Adriweb" Bertrand
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 */

/*
**************
Todo/wish list
**************
====
MUST
====

------------------
General / multiple
------------------
	* modularize the code further. The linking emulation code is now separated from the core code, but maybe the CPU, for instance, could be separated from the core ??
	  That would be a prerequisite for...
	* rewrite time-critical chunks of the emulator using asm.js constructs as Kerm & jacobly have worked on doing for jsTIfied. See https://github.com/dherman/asm.js .
	  Non-typed arrays are forbidden ?
	* add save state (and restore state, obviously) support...
	  Ideas:
		* generating a JS object containing all of the relevant emulator state and exporting it as JSON [jsTIfied uses JSON, makes sense anyway];
		* loading the JSON, regenerating reset() and instructions, launching initemu().

----
Core
----
	* check build_* functions against M68000PRM. Two errors wrt. address registers have already been found (and ~600 instructions which should have been illegal made so), chances are that there are more problems.
	* partially implemented semi-infrequent processor instructions:
		* TAS: implemented - not checked.
	* lsl(), asl(), lsr(), asr(), rol(), ror(), roxl() and roxr() should be generated, optimized, and probably have the "size" argument constant-propagated.
	* the add*(), cmp*() and sub*() functions should be generated.
	* disassembly support for all remaining unimplemented instructions (if any).
	* cycle count support for all implemented instructions.
		* NOTE: dynamic shift counts not yet implemented.

	* unimplemented infrequent processor instructions:
		* CHK: implementation is definitely wrong;
		* STOP: correctly disassembled, currently wrongly implemented as a 4-byte NOP. Very rarely used, but there are several occurrences of STOP in AMS, usually dead ends because they're followed by a branch which gets back to the stop.
		* MOVEP: correctly disassembled, currently wrongly implemented as a 4-byte NOP. Not sure whoever used that on the TI-68k series and whether it works :D

	  Useful resources: M68000PRM.pdf, http://goldencrystal.free.fr/M68kOpcodes.pdf:

	* disassembler: for address register indexed with displacement, warn if scale bits != 0 (CPU32+) or bd/od present (68020+).
	* useful hardware ports not handled:
		* writes to 60001B: acknowledge AUTO_INT_2 for keyboard.

-------
Linking
-------
	* add linking support for sending 89g/9xg/v2g group files to the emulator.
		* libtifiles, files9x.c::ti9x_file_read_regular(): loop on the number of entries (word at offset 0x3A). Requires changes (and why not some added sanity checking...) in emu.handle_newfileready() + link.sendfile().
		* libticalcs, calc_89.c::send_var(): loop on the number of entries.
	* add linking support for sending tig group files to the emulator, which are uncompressed ZIP archives.
	  Use https://en.wikipedia.org/wiki/ZIP_%28file_format%29 as a reference (only need to parse PK\x03\x04 entries, after all; parsing PK\x01\x02 and PK\x05\x06 sections is not strictly required), or maybe simply use an existing external library with a compatible license ?
	* add linking support for sending 89b/9xb/v2b backup files to the emulator.
		* libtifiles, files9x.c::ti9x_file_read_backup(): there's some metadata before the content, the content part is read as a whole;
		* libticalcs, calc_89.c::send_backup(): a rather thin wrapper over send_var().
	* add linking support for receiving multiple files in a row, especially for the purposes of non-silent linking.

-------
UI part
-------
	* add UI for receiving a single file through silent linking, presumably based on window.prompt() in the standalone version. Needs a user-friendly solution for doing the same thing as buildFileExtensionFromVartype()...
	* add UI for displaying the result of dirlist, selecting variables, and triggering receive for those variables.
	* add UI for _selecting_ multiple files to be sent to the emulator. Suggested by Folco. Sending multiple files at a time has been possible for a while with a loop over sendfile(), as shown by the TI-Planet integration.
	* add large skins for 89, V200, 89T: the small skins are flat out unreadable on modern, not even necessarily high-definition screens (even a 15" 1920x1080 screen).
	* add / change key bindings in handle_keys_89_89T() and handle_keys_92P_V200(): for consistency with VTI and TIEmu, it would be great if F10 triggered the file input (romfile). Reported by Folco.
	* make it possible to generate screenshots with 3:1 and 4:1 scaling. The code for upscaling with those factors already exists inside the UI part, but it's not exposed yet.
	* generation of animated GIF images, see e.g. https://github.com/antimatter15/jsgif and https://github.com/deanm/omggif . jsTIfied does it.

--------
Debugger (would ease implementation of some other features) providing most of the features from JM's modified VTI & TIEmu :P:
--------
	* (mostly done) implement disassembly(address, count) - in the beginning, through simple string substitution, we'll see whether that's enough;
	* memory display area, with search functions;
	* Ptr2Hd implementation;
	* traverse the VAT - see core/ti_sw/var.c in TIEmu.
	* add ROM_CALL table in an external file in JSON format, and have ROM_CALL() handle string arguments (for returning the address of a ROM_CALL). Maybe 3 tables inside the object wrapping ROM_CALL table access: one sorted by ROM_CALL number, one sorted by name, one sorted by address. That way, we could use binary search in all situations;
	* etc.
  Breakpoints are going to kill emulation speed :(

----------
Test suite
----------
* expand the test suite. The one started by debrouxl is currently pretty small. Finding a ready-made test program for a 68000 seems to be extremely hard, though - debrouxl spent hours looking in emulators such as Cyclone, and with generic search engine, to no avail ?

======
SHOULD
======
	* optimize more...
	  NOTE: with default optimization level Google Closure compiler doesn't seem to help much, on either Firefox or Chrome.
	  NOTE: various weirdness and counter-intuitive behaviour was met while trying to optimize, see the changelog below.
	  Might use arrays of 16-bit signed integers for link_incoming_queue and link_outgoing_queue, the special values being negative numbers ? But then, no Array.push()...
	  lsl(), rol() and several other shift/rotates were pessimized as a result of correctness fixes.
	* make a more immediate implementation of pause / restart emulation: somehow stop immediately, instead of removing interval timer for emu_main_loop().
	* add symbolic key codes to sendkeys() ?

=====
MIGHT
=====
	* implement remaining hardware ports or bits thereof:
		- 600000 (battery checker bit). Don't care on emulator.
		- 600001 (for RAM interleaving and vector table protection). Proper emulation of that would make emulation slower due to extra checks in memory write functions...
		- 600018 not fully handled: battery checker bits. Don't care on emulator.
		- 600012 (for LCD logical width), 60001C (LCD row sync frequency): largely useless, though they provide a way to detect the screen being turned off.
		- R/W 700000-700007, 700008-70000F, 700012: RAM execution protection, ghost of RAM execution protection, and Flash execution protection. Emulating these harmful things would make everything slower.
		- 700011 "something to do with link port transfer speed". Nobody uses that.
		- R/W 700014 (RTC with extra slow incrementation) - useless for practical purposes, though easy to implement.
		- R/W 70001D battery checker bits


********************************************
Changelog from PatrickD's version / work log
********************************************
	* generated memory read and write functions
	  (debrouxl, 2012)
	* trace reads and writes to unimplemented MMIO ports
	  (debrouxl, 2012)
	* AMS 2.xx support
	  (debrouxl, spring of 2013: values > 32 bits wide in an and dn wrecked havoc)
	* 89, V200 & 89T support in memory read and write functions - easy once the functions are generated.
	  (debrouxl, 2013/07)
	* profiling round 1, and subsequent optimization of movem emulation by nearly an order of magnitude through removal of eval (eww !)
	  (debrouxl, 2013/07/07-09)
	* basic screenshot support
	  (Adriweb 2013/07/09)
	* add support for sending files to AMS (works with an old version of PedroM, but not with AMS)
	  (debrouxl 2013/07/10-11: checked against libticalcs' code, then examined libticables dumps, and adjusted several items)
	* move the try / catch from inside the innermost loop of emu_main_loop() to outside that loop, making emulation ~5% faster on Chrome.
	  (debrouxl 2013/07/11)
	* make it possible to transfer files to a folder other than main (trivial)
	  (debrouxl 2013/07/12)
	* fix SIN / COS / TAN keys (reported by critor)
	* add 1:1 screen output, without scaling
	  (debrouxl 2013/07/13)
	* moved the try / catch even further up, and used fire_cpu_exception instead of throw. Makes emulation faster while not affecting correctness, AFAICS.
	  (debrouxl 2013/07/13)
	* add a button for resetting calculator - effectively, triggering initialize_calculator()
	  (debrouxl 2013/07/13)
	* write memory dump function, needed for debugger
	  (debrouxl 2013/07/13)
	* write handles traversal functions, needed for debugger
	  (debrouxl 2013/07/13)
	* extremely crude support for Flash memory, needs patching the OS image to NOP out all of the writes in the worker routine of FL_write.
	  (debrouxl 2013/07/13)
	* v4tibconv.py needs to be able to cope with .xxu files (like the JS part of the emulator does). Easy, should check for **TIFL** + other markers and skip the appropriate number of bytes.
	  (debrouxl 2013/07/14)
	* fix port 600019 handling: the code referenced an undefined variable. Needed for 89 support.
	  (debrouxl 2013/07/14)
	* use ROM_base instead of hard-coded value for initial PC in reset_calculator(). Needed for 89 support.
	  (debrouxl 2013/07/14)
	* add port 600018 (keyboard & battery) / 60001D (contrast & HW1 screen disable) / 70001D (HW2 LCD FS bit & screen enable) / 70001F (HW2 interrupts master switch) R/W.
	  (debrouxl 2013/07/14-15)
	* fix dozens of errors reported by Google Closure compiler in VERBOSE warning mode
	  (debrouxl 2013/07/14)
	* slightly optimize creation of initial instruction handlers: do not make A000-AFFF and F000-FFFF unhandled only to redefine them shortly thereafter
	  (debrouxl 2013/07/14)
	* add 89/89T keyboard handling in handle_keys() - thanks !
	  (critor 2013/07/15)
	* have v4tibconv.py auto-detect the calculator model
	  (debrouxl 2013/07/14-15)
	* use a typed array for rom, which means creating a new version of v4tibconv.py (v11tibconv.py): no push() on typed arrays.
	  (debrouxl 2013/07/14-15)
	* add support for transferring files to 89 / 89T. It was enough to handle the 89/89T linking calc IDs.
	  (debrouxl 2013/07/15)
	* rewrite rb/rw/wb/ww generation and assignation again.
	  The aim is to pre-generate all variants (92+, 89, V200, 89T) in both normal and special (during Flash writes) mode, and to dynamically assign one of them to each of rb/rw/wb/ww, depending on calculator model (in reset_calculator()) and Flash write mode (from the memory read / write functions themselves).
	  (debrouxl 2013/07/15)
	* unimplemented processor instructions: RTR, ILLEGAL, TRAPV
	  (debrouxl 2013/07/15)
	* WIP: unimplemented processor instructions: CHK, TAS
	  (debrouxl 2013/07/15)
	* decode SR flags
	  (debrouxl 2013/07/15)
	* add proper support for Flash memory, which doesn't require editing the OS image
	  (debrouxl 2013/07/16)
	* refactor the code for sending files to the emulator, so that the largely common code paths for regular files and Flash files can be shared.
	  The format of Flash files is different from the format of regular files, the differences are handled by the callers.
	  (debrouxl 2013/07/16)
	* add linking-side support for sending FlashApps (which can be > 64 KB) to AMS. Requires slightly different linking protocol, with a loop.
	  The linking emulation is alright (it can cope with the likes of 100+KB GTC), but for some reason, the two first bytes of the header, and possibly other bytes, are written incorrectly; that can be worked around by using tiosmod+amspatch.
	  (debrouxl 2013/07/16)
	* fix a couple keymap definitions for 89 / 89T
	  (critor 2013/07/17)
	* split handle_keys() into two functions, one for 89 / 89T and one for 92+ / V200
	  (debrouxl 2013/07/17)
	* split calls to create_button() to their own function (needs more refactoring later, should probably be moved to another, new file)
	  (debrouxl 2013/07/17)
	* start disassembler implementation, based on post-processing the contents of the n[] array (for now).
	  Several TODOs written down in the code.
	  (debrouxl 2013/07/18)
	* when importing a ROM image in emu_main_loop(), use a typed array.
	  (debrouxl 2013/07/18)
	* attempt to auto-detect calculator model from the imported OS image / ROM dump before reinitializing the entire emulator, as the calculator model may have changed. No need for a complicated method, Lionel, you can just rely on the calculator model field in the header (and post-process it with the contents of the HWPB if necessary)...
	  (debrouxl 2013/07/18-19)
	* in v11tibconv.py, store the appropriate HWPB address, the appropriate model ID, and a likely gate array revision, into the HWPB.
	  (debrouxl 2013/07/19)
	* when importing a TIB / XXU image in emu_main_loop(), use a typed array.
	  (debrouxl 2013/07/19)
	* add button for ON key with mousedown/touchdown/mouseup/touchup handlers and 60001A port state
	  (debrouxl 2013/07/19)
	* split and factor dumping of incoming and outgoing link queues to separate functions
	  (debrouxl 2013/07/19)
	* rename WAIT_OK link pseudo-state to WAIT_ACK
	  (debrouxl 2013/07/19)
	* add skeleton of the support for getting files out of the emulator.
	  For now, packets sent by the calculator are skipped properly, and the variable name needs to be passed to recvfile() as an array of integers.
	  (debrouxl 2013/07/19)
	* make recvfile() able to deal with a varname passed as string instead of an array of integers.
	  (debrouxl 2013/07/20)
	(* fail to optimize movem handlers by manually constant-propagating "size" argument and generating two different routines for each load/store_multiple: doing so seems to consistently slow down on Firefox !
	  (debrouxl 2013/07/21))
	(* fail to find why memory consumption increases over time: Chrome's profiling over 8 hours (at speed ~ 1/10 of native) shows no allocation above 256 KB, and that allocation seems to simply replace the old one
	  (debrouxl 2013/07/21))
	* add a create_buttons variable, initialized with create_buttons_large_92p_skin().
	  (debrouxl 2013/07/23)
	* disassembler improvements (movem regs decoding) and fixes (LINK, ADD/SUB/OR/AND/EOR, ABCD/SBCD, d(an,ix), d(pc,ix), MOVEQ).
	  (debrouxl 2013/07/23)
	* eliminate invalid instructions from emulation core:
	  * build_moves(): eliminate byte moves _from_ address registers (byte moves _to_ address registers were already forbidden);
	  * build_bit_operation(): BCHG / BCLR / BSET / BTST to address registers are forbidden.
	  (debrouxl 2013/07/23)
	* add first implementation of NBCD, and build NBCD instructions.
	  (debrouxl 2013/07/24)
	* build the highly infrequent MOVEP instructions, implemented by 4-byte NOPs for now (but disassembly works, that's what I aimed at).
	  (debrouxl 2013/07/24)
	* add initial support for retrieving files from the emulator:
	  * additional button + link in the HTML code (should be made simpler if possible !);
	  * moved core of recvfile() to recvfile_requestchunk() so that it can be called by link_handling() for receiving more than one chunk;
	  * add link_reset_state() to factor out some duplicated code (and reset more variables);
	  * add link_build_output_file() (simplified from libtifiles: ti9x_file_write_regular()), link_magic_number();
	  * when handling WAIT_ACK, eat less data from link_outgoing_queue;
	  * when handling WAIT_VAR, eat less data from link_outgoing_queue;
	  * when handling WAIT_XDP, process contents from VAR packet (varsize, vartype, varname);
	  * when handling WAIT_CNT, process contents from XDP packet, and either build output file (when receiving EOT) or request another chunk (when receiving CNT);
	  * add getFileData() and helper buildFileExtensionFromVartype() function.
	  (debrouxl 2013/07/25)
=======================================
	* create version 12
	  (debrouxl 2013/07/25)
	* uncomment a line to enable support for port 600005, which tremendously reduces browser CPU consumption (~3x-4x) when idling in AMS. Add a trace for resuming in fire_cpu_exception.
	  (debrouxl 2013/07/25)
	* when downloading the file created by recvfile(), prepend folder name to file name.
	  (debrouxl 2013/07/25)
	* in file reception, when processing the contents of VAR and XDP packets, compare checksums modulo 2^16, so as to avoid spurious "wrong checksum" messages.
	  (debrouxl 2013/07/25)
	* move innermost loop out of emu_main_loop() into execute_instructions(). Should have low (enough) speed impact, and will enable debugger usage (execute N instructions). While at it, remove more than 10 KB of outdated debugging code.
	  (debrouxl 2013/07/26)
	* early modularization work: wrap everything into a single object which exports a subset of its internals, used by the HTML code or for debugging.
	  (debrouxl 2013/07/26)
	* as a result of the modularization work, move emulator checking code into the emulator object (instead of having to export a number of internal functions to the outside...)
	  (debrouxl 2013/07/26)
	* make it possible to select screen scaling through the HTML page, instead of having to change the JS code.
	  (debrouxl 2013/07/26)
	* further modularization work: move some of the UI into a second object.
	  (debrouxl 2013/07/26)
	* slightly less wrong emulation of the keyboard: fire AUTO_INT_2 from setKey() when a key which wasn't pressed before is pressed.
	  Makes the highest usability annoyance a bit less annoying, but doesn't fix it.
	  (debrouxl 2013/07/27)
	* move getPNG() and pngButtons() from core to UI.
	  (debrouxl 2013/07/27)
	* implement emulator pause / resume by using clearInterval() / setInterval().
	  (debrouxl 2013/07/27)
	* integrate critor's small skins and button definitions; rework HTML; dynamically change more HTML elements.
	  (debrouxl 2013/07/27)
	* repurpose "screen scaling ratio" radio buttons for "small skin" / "large skin" selection.
	  (debrouxl 2013/07/27)
	* add getter and setter for newfileready and newflashfileready, which can be used by other HTML pages to inject files. Reported by critor.
	  (debrouxl 2013/07/28)
	* fix broken keymaps after switching keyboard - the child "area" elements of the map should be cleared. Reported by critor.
	  (debrouxl 2013/07/28)
	* export to_hex(), to_hex2(), memory_dump() from core
	  (debrouxl 2013/07/28)
	* add testcases for subl(), divu(), divs(), mulu(), muls().
	  (debrouxl 2013/07/28)
	* make divs() more correct by clamping divisor value to 0-FFFF.
	  (debrouxl 2013/07/28)
	* fix sbcd(): shouldn't use variable "finalresult" before it is defined, should read borrow from X.
	  (debrouxl 2013/07/29)
	* fix nbcd(): shouldn't use variable "finalresult" before it is defined.
	  (debrouxl 2013/07/29)
	* rewrite addx() to be more similar to add*() functions
	  (debrouxl 2013/07/29)
	* fix update_sr(): ignore nonexistent flags.
	  (debrouxl 2013/07/29)
	* negx building: clear N, Z, V, C before computing negation with extend.
	  (debrouxl 2013/07/29)
	* add empty check_addx(), check_subx(), check_asl(), check_lsr(), check_asr(), check_ror(), check_roxr(), check_roxl()
	* rewrite lsl() and rol() for correctness, add check_lsl() and check_rol() with a single testcase.
	  Fixes ExtGraph demo13-17 + demo29, which had glitches when scrolling rightwards, and demo32, where some of the 32-pixel sprites had glitches.
	  (debrouxl 2013/07/30)
	(* fail to optimize rw_*_normal, by:
		* using a pre-generated switch statement with 4096 cases: on Firefox, it consistently slows down the emulator by ~10%, and on Chrome, the slowdown is a horrendous ~5x !
		* using a pre-generated array of 4096 functions (suggested by benryves & shaun on #cemetech): on Firefox, it's about the same as a switch statement, and on Chrome, the slowdown is ~2x...
	  (debrouxl 2013/07/31))
	(* fail to optimize rw_*_normal with 256-case switch and 256-element array of functions: still slower than the original code...
	  (debrouxl 2013/08/01))
	* add execute_one_instruction() function.
	  (debrouxl 2013/08/03)
	* hopefully make the code work with "use strict" statements (there might remain undeclared variables).
	  (debrouxl 2013/08/03)
	* add setters for d0-d7, a0-a8, sr and pc
	  (debrouxl 2013/08/04)
	* rename rw_*_flash to rw_*_flashspecial
	  (debrouxl 2013/08/04)
	(* fail to optimize movem emulation by using special versions of rw/rl/ww/wl which care only about RAM, it barely makes a difference - JS optimization is definitely highly peculiar and a moving target...
	  (debrouxl 2013/08/04))
	* fix multiple shift and rotate routines, fixing highly visible bugs which had been noticed for a while:
		* some floating-point routines are broken:
			* sin^-1, cos^-1 and tan^-1 return garbage;
			* x, x^2, e^x, 1/x, sin, cos, tan, sqrt, sinh, cosh, tanh, sinh^-1, cosh^-1, tanh^-1 are OK.
		* in the graph screen, F7 Draw - 4 Circle circles have a... um, strange shape.
		* modified DrawGrayBuffer_TRANW and DrawGrayBuffer_RPLC routines, with roxl instead of rol, show bugginess in the emulation of roxl.
	  (debrouxl 2013/08/04)
	* fix 89T bootup by properly emulating the 0-200000 address space (no ghosts of the RAM). The code of rw_*_normal used to be wrong until recently, but it happened to trick the ghost space checking code in AMS (82241C subroutine in 3.10); the version which does not access outside of the bounds of RAM was correct, but didn't make it possible to boot the 89T OS. Bug reported by critor.
	  (debrouxl 2013/08/04)
	* add emulation of 70001D bit 7 (LCD FS) for HW2+.
	  (debrouxl 2013/08/04)
	* sketch out support of LCD contrast and LCD enable:
		* move colors out of draw_calcscreen();
		* add screen_enabled and set_screen_enabled_and_contrast();
		* call set_screen_enabled_and_contrast() when ports 60001D, 70001D or 70001F are changed;
	  (debrouxl 2013/08/04)
	* emulate HW2+ snoop palette range (700017).
	  (debrouxl 2013/08/04)
	* make one more fix for lsl(): should clear N, Z, V, C at the beginning. Failure to do so tripped the VTI detection in ExtGraph's alternate grayscale routine, which wrongly failed to take the bpl on HW2.
	  (debrouxl 2013/08/04)
	* change screen pixel colors according to contrast setting (60001D, 70001F).
	  (debrouxl 2013/08/04)
	(* notice that FlashApps, which used not to be written correctly, now work :)
	  It is possible to use pristine OS upgrades whose Flashapp validation is not rendered ineffective (Flashappy / tiosmod+amspatch).
	  The fact that the 2 first bytes of the header (which might be written last ?) were not written properly could have been a consequence of the fact something else is wrong with either the FlashApp's contents or the bignum computations, which might have been a consequence of badness in shifts and rotates ?
	  (debrouxl 2013/08/06))
	* when sending a file to the emulator, take into account the "archive" / "lock" byte contained in computer files. Reported by critor.
	  (debrouxl 2013/08/07)

	* add apiversion() to EmulatorCoreModule.
	  (debrouxl 2013/12/13)
	* add copyright information.
	  (debrouxl 2013/12/13)
	* move todo/wish list from standalone HTML page to this file.
	  (debrouxl 2013/12/13)

	* create README file.
	  (debrouxl 2014/01/01)
	* extract the arguments of document.getElementById() to variables, and move to UI the remaining references to "document" from core through several new UI methods.
	  (debrouxl 2014/02/01)
	* add setters for the variables containing the document element IDs.
	  (debrouxl 2014/02/01)
	* add support for sending keypresses (was pretty easy). Reported by critor.
	  (debrouxl 2014/02/01)
	* rename EmulatorCoreModule and EmulatorUIModule to TI68kEmulatorCoreModule and TI68kEmulatorUIModule.
	  (debrouxl 2014/02/02)
	* move linking emulation code to a new, separate "TI68kEmulatorLinkModule" object. jsTIfied has a separate object for linking emulation as well.
	  (debrouxl 2014/02/02)
	* add areas for ON buttons in the 4 skins from which they have been missing for a long time...
	  (debrouxl 2014/02/02)
	* screen handling improvements:
		* add variables for ports 600012, 60001B, 60001C;
		* pass 60001C to ui.set_screen_enabled_and_contrast();
		* enable !screen_enabled code path in ui.draw_calcscreen(): screen white when disabled.
	  (debrouxl 2014/02/02)
	* add link.sendkeys() convenience function. Usage example: link.sendkeys([0x65, 0x78, 0x65, 0x63, 0x28, 0x22, 0x34, 0x65, 0x34, 0x34, 0x34, 0x65, 0x37, 0x35, 0x30, 0x30, 0x30, 0x30, 0x22, 0x29]);
	  (debrouxl 2014/02/02)
	* implement pending interrupts mechanism (see TIEmu's src/core/ti_hw/m68k.c). Lack of such a mechanism was the root cause of an old bug noticed in July 2013, but thoroughly investigated only now: "when the emulated V200 calculator turns off, ON does not properly put it back, even with the code added 2013/07/25 in fire_cpu_exception(). pc definitely points to the next instruction, so we're not re-executing the same instruction over and over."
	  (debrouxl 2014/02/03)
	* fix key codes for UP in 89 and 89T keyboards.
	  (debrouxl 2014/02/03)
	* fix area for F3 in large 92+ keyboard.
	  (debrouxl 2014/02/03)
	* add cycle counts array, fill in several trivial cases.
	  (debrouxl 2014/02/03)
	* decreased incrementation rate of osc2_counter to the expected value of 32 (from 128).
	  (debrouxl 2014/02/03)
	* fix broken manual off: in execute_instructions(), obtaining the interrupt level before (possibly) calling fire_cpu_exception() cannot be moved out of the loop.
	  (debrouxl 2014/02/04)
	* improve link.sendkeys() to handle both numbers and strings in the passed array, so that link.sendkeys(['exec("4e444e750000")', 0xD]); becomes possible.
	  (debrouxl 2014/02/04)
	* implement RESET (4E70) instruction.
	  (debrouxl 2014/02/04)
	* have all remaining privileged instructions check for S bit, e.g. ANDI to SR, EORI to SR, ORI to SR, MOVE to SR.
	  (debrouxl 2014/02/04)
	* implement instruction costs for ANDI to SR, EORI to SR, ORI to SR, CMPM, ADDX, SUBX, ABCD, SBCD, A-Line, F-Line.
	  (debrouxl 2014/02/04)
	* in build_moves(), if the destination is an address register, make the mnemonic "MOVEA" instead of "MOVE". Indirectly reported by Folco.
	  (debrouxl 2014/02/05)
	* add 3:1 and 4:1 screen scaling ratio support, the scaling routines are fairly slow.
	  (debrouxl 2014/02/08)
	* add several classic key bindings known from VTI & TIEmu in handle_keys_89_89T() and handle_keys_92P_V200(): Shift, Diamond, 2nd, Clear, Hand, ON. Some of them reported by Folco.
	  On a wide range of browsers, left shift has code 16, left Ctrl has code 17, left Alt has code 18, Caps Lock has code 20, Insert has code 45, Delete has code 46. On at least a couple modern browsers, Scroll Lock has code 145. See e.g. http://javascript.info/tutorial/keyboard-events for a test program, and http://unixpapa.com/js/key.html for analysis on old browsers.
	  (debrouxl 2014/02/08)
	* remove F10 -> Shift key binding from handle_keys_89_89T() and handle_keys_92P_V200(), for consistency with VTI and TIEmu, which map "Send file to emulator..." onto F10.
	  (debrouxl 2014/02/08)
	* fix bug in v12tibconv.py: for the last chunk of non-0xFFFF words, it sometimes failed to add ',' where necessary and produced the following invalid output on V200 AMS 3.10:
	  rom.set([55068,2483265535,...)
	  (debrouxl 2014/02/10)
	* remove F9 -> F1 key binding from handle_keys_92P_V200(), map APPS onto F9 instead for both 89/89T and 92+/V200, for consistency with VTI and TIEmu.
	  (debrouxl 2014/02/10)
	* make additional tests which show that files transfer to PedroM, broken at some point, was fixed later without noticing.
	  2013/08: according to critor, PedroM 0.82 failed to understand the linking emulation now, while I seem to be generating the exact same data as libticalcs. For a reasonably general-purpose, non-developer-user-oriented emulator, it's more important for AMS to work than for PedroM to work - but still...
	  2014/02/05: for Folco, transferring a program worked on the first try, so it's not totally broken - or it was somehow fixed in-between.
	  (debrouxl 2014/02/10)
	* make additional tests which show that Punix beta 5, which this emulator used to fail emulating, now works, even if the upper part of the screen refreshes
	  (debrouxl 2014/02/12)
	* in ui.initEmu(), print a warning to the console if one of the HTML DOM elements was not found by getElementById(). Reported by critor last summer.
	  (debrouxl 2014/02/12)
	* perform more work on key bindings:
		* in handle_keys_89_89T():
			* reorder code in ascending order of index into the emulated keyboard;
			* add A-S, U-W mappings (significant usability improvement);
			* map CATALOG onto F6 (instead of F1), for consistency with TIEmu;
			* for 89/89T, map EE onto Insert, for consistency with TIEmu;
		* in handle_keys_92P_V200():
			* reorder code in ascending order of index into the emulated keyboard;
			* fix index of ; for simulated (-): should be 79 instead of 81, which is out of the bounds of the array.
	  (debrouxl 2014/02/12)
	* set initial value of tracecount to 0.
	  (debrouxl 2014/02/12)
	* optimize screen drawing and scaling on 89/89T: no need to compute 240x128 pixels, we can just compute 160x100 pixels.
	  (debrouxl 2014/02/13)
	* add some support for changing the number of frames used for averaging.
	  (debrouxl 2014/02/13)
	* move back the try / catch at a deeper scope in emu_main_loop(), making two steps forward and one step back in emulation accuracy.
	  + the timer rate is more correct now, though slightly too fast. On V200 AMS 3.10, reaching 12:05 and the APD used to take ~15 real minutes to reach 12:05, and the HOME cursor blinked too slowly; now, reaching 12:05 takes something closer to 4 real minutes, and the HOME cursor blinks too quickly.
	  + grayscale emulation is _much_ better now. Flickering used to be horrible, for a long time (and was the reason why I added support for changing the number of frames used for averaging, but that didn't yield the expected results); not anymore.
	  - the "Average milliseconds for the last 1000 frames is ..." figures indicated in the page's title have been multiplied by 3 to 4.
	  - ON button functionality is lost again when the calculator is ON. However, it can still wake the calculator up from APD, and break AMS computations. The interrupt is properly marked pending, and the handler is definitely triggered. Will have to debug that.
	  In the short and mid terms, having better screen and better timer emulation is arguably more useful than having full functionality of the ON button.
	  (debrouxl 2014/02/15)
	* show direct feedback to the user when no ROM is loaded.
	  (debrouxl 2014/02/16)
	* improve ROM import and reset, so that the initial PC and SSP are loaded from ROM_base before trying to load them from ROM_base+0x12088. If the initial PC and SSP from boot code are sane enough AND the certificate memory marker is correct, boot from boot code; otherwise, boot from OS.
	  TIEmu always boots from OS area.
	  (debrouxl 2014/02/16)
	* fix disassembly output for move: the branches of the ? : condition for turning move to movea were swapped
	  (debrouxl 2014/02/16)
	* add set_white_color() and set_black_color() in UI.
	  (debrouxl 2014/02/16)
	* fix Flash memory emulation bug inherited from TIEmu, see the list of achievements below for more detail.
	  When running the boot code from a ROM dump by libti*, the calculator emulated by TIEmu crashes, while this emulator can now display the "Corrupt Certificate Memory" message (if the marker is alright but the rest is wrong).
	  (debrouxl 2014/02/16)
	* add 8 MB Flash support to 89T emulation.
	  At some point, TIEmu had such support as well, when we wrongly believed that 89T HW4 had 8 MB of Flash memory.
	  The Flash memory chip size detection code in the boot code and OS (the one whose emulation was fixed by the previous change) can easily be tricked into believing that there's a 8 MB chip. This way, we can get to know what a 8 MB 89T would have looked like... not that it matters in practice, in the (sad) absence of real-world calculators possessing such a feature, but still :)
	  (debrouxl 2014/02/16)
	* when importing a TIB / xxu, produce a fake HWPB in detect_calculator_model(), like v12tibconv.py does.
	  (debrouxl 2014/02/16)
	* align values computed by nbcd() on those produced by TIEmu (UAE), even if the implementation in this emulator is _very_ different.
	  That lets execution of HW3Patch proceed a bit further, even if the pipeline-exercising SMC in the part encoded with trivial not operation still trips this emulator.
	  (debrouxl 2014/02/16)
	* add some twist, disabled by default, in the emulation of an instruction. Maybe related to the previous item, who knows ? ;) 
	  (debrouxl 2014/02/16)
	* add keypad 0 to 9 key bindings in handle_keys_89_89T() and handle_keys_92P_V200().
	  (debrouxl 2014/02/17)
	* fix waking up from sleep in raise_interrupt(): wakemask counts interruptions from bit 0 instead of bit 1. Fixes emulation of Ice Hockey 68k, among others.
	  (debrouxl 2014/02/17)
	* add cycle counting in execute_instructions().
	  (debrouxl 2014/02/17)
	* add erase_ram_upon_reset variable and setter, and in reset_calculator(), erase RAM only if erase_ram_upon_reset is true.
	  (debrouxl 2014/02/17)
	* comment out execute_one_instruction() for now, it's unused and unexported.
	  (debrouxl 2014/02/17)
	* add several check_*() functions, most of them empty for now.
	  (debrouxl 2014/02/18)
	* add increase_emulator_speed() and decrease_emulator_speed() for changing the rate of the main interval timer.
	  (debrouxl 2014/02/23)
	* add buttons for increasing and decreasing emulator speed.
	  (debrouxl 2014/02/24)
	* implement instruction costs for Bcc and BSR.
	  (debrouxl 2014/02/24)
	* executing CHK instructions shouldn't call nonexistent raise_cpu_exception() function...
	  (debrouxl 2014/02/24)
	* in fire_cpu_exception(), make the special bus/address error frame (more) compliant with standard 68000 frame format, adding several emulator variables in the process.
	  (debrouxl 2014/02/24)
	* in disassemble(), add an early exit if address is odd.
	  (debrouxl 2014/02/25)
	* add effective_address_calculation_time() function, extracted from the 68000 User manual; start using it in build_addsubq(), build_moves(), build_clr_tst_tas(), build_bcd().
	  (debrouxl 2014/02/25)
	* after discussion with UnknownLoner, who confirmed try/catch is bad for performance, remove it and stop using throw for handling low-power / off (port 600005) mode.
	  (debrouxl 2014/02/26)
	* fuse build_not_neg() and build_clr_tst_tas() into build_not_neg_clr_tst_tas(), as the instruction costs for those are similar.
	  (debrouxl 2014/03/01)
	* implement most remaining instruction costs: less than 3000 known instructions remain cost-less, down from more than 30000 before today.
	  (debrouxl 2014/03/01)
	* split several one-liner inlined linking primitives to separate functions.
	  (debrouxl 2014/03/02)
	* split two larger code blocks from link.link_handling() to link.process_recv_XDP() and link.process_recv_CNTEOT(), so that they can be called from multiple places as needed.
	  (debrouxl 2014/03/02)
	* add support for receiving a single file from the calculator in a non-silent way.
	  (debrouxl 2014/03/02)
	* in ui.getFileData(), call functions from link rather than from emu, because that's where they have been for a while...
	  (debrouxl 2014/03/02)
	* split more inlined linking primitives to separate functions: ti89_send_CTS(), ti89_send_XDP(), ti89_send_REQ(), ti89_send_RTS().
	  (debrouxl 2014/03/03)
	* start implementing support for dirlist, needed a fix in process_recv_XDP() so that memory consumption remains under control.
	  (debrouxl 2014/03/03)
	* in TI68kEmulatorLinkModule object, use calculator_model directly, instead of using emu.calculator_model (which is wrong anyway, should be emu.calculator_model()).
	  (debrouxl 2014/03/07)
	* finish implementing support for dirlist: several new functions and variables added, several fixes (such as clamping array allocations based on link_recv_varsize to 64 KB).
	  (debrouxl 2014/03/07)
	* add link_reset_recv_vars() and link_reset_dirlist_vars() helper functions.
	  (debrouxl 2014/03/07)
	* rename link_recv_filedata to link_recv_data, as data received from the calculator is no longer necessarily a file (it can be the contents of a dirlist).
	  (debrouxl 2014/03/07)
	* significantly reorganize todo/wish list.
	  (debrouxl 2014/03/08)
	* note that the following annoying behaviours of the emulator have been fixed, or at least alleviated, by a combination of code modifications and browser JS engine improvements:
		* frequent emulator (apparent) hangs upon user clicks or keypresses...
		  One of the simple reproducers is pressing F1 in the APPS Desktop on V200 AMS 3.10.
		  It's not a consequence of port 600005 emulation being missing (the situation is not better after adding it).
		  2013/07/27: a slightly less wrong implementation of the keyboard handling seems to help.
		  2014/02/03: after implementing pending interrupts, the fact of no longer raising AUTO_INT_2 (with simplistic and wrong code) seems to help.
		  2014/02/15: perhaps the last part of the fix was performed by putting back the try / catch at a deeper scope in execute_instructions() ?
		* investigate why the emulator's memory consumption increases over time in such a way that the process ends up being killed in Chrome (even though profiling shows nothing of the appropriate order of magnitude ?!), and fix.
		  2014/02/10: does that still occur 8 months later ?
		* investigate emulator slowness on Firefox Nightly (it doesn't seem to occur on Chrome ?) after transferring a file.
		  The slowness doesn't seem to disappear on its own, but it tends to disappear a while after the VAR-Link is launched and exited. Might be linking-related ??
		  Idea: "WAIT_OK_LAST" special value, upon which the emulator should clear the incoming and outgoing queues ?
		  Or maybe it's just bad interaction with the GC's mechanics...
		  2014/02/10: does that still occur 8 months later ?
	  (debrouxl 2014/03/08)
	* wrap instruction table building into build_all_instructions().
	  (debrouxl 2014/03/08)
	* add stubs for save state and restore state functions in emu, link and ui.
	  (debrouxl 2014/03/08)
	* move most core emulator variables to a new inner "state" object, which should help implementing state saving (and maybe state restoring ?). For now, only a0-a7 are missing, as moving them to "state" triggers an address error when displaying the V200 AMS 3.10 apps desktop... probably a missed conversion somewhere.
	  A side effect of the change is that the emulator becomes faster. That's due to looking up methods and variables up in a narrower scope (confirmed by UnknownLoner).
	  (debrouxl 2014/03/08)
	* make not.size an, neg.size an, negx.size an instructions undefined.
	  (debrouxl 2014/03/09)
	* fix the build_exchange() code to read from state.dn and state.an. Fixes Address error when booting V200 AMS 3.10 after moving address registers into state, which makes the emulator slightly faster again :)
	  (debrouxl 2014/03/09)
	* move t[], n[] and cycles[] to new inner "cpu" object. Speed impact seems within the noise.
	  (debrouxl 2014/03/09)


Achievements:
	* on 2013/07/30, this emulator uncovered a nearly 6-year-old bug in the alternate grayscale routine for ExtGraph (gray.o). An invalid optimization in a HW1-only code path was added to ExtGraph around 2007/08/13.
	  The bug prevented demo12-demo17, demo19, demo22, demo24-demo26 from displaying the expected data on the emulator.
	  Subsequently, these demos provided a nice bunch of reduced testcases for bugs in the emulator:
		* pinpointing and fixing a problem in the emulation of lsl() and rol();
		* showing that asl instead of lsl in DrawGrayBuffer_RPLC and DrawGrayBuffer_TRANW (used by demo13) doesn't yield the same graphical glitch, so asl() was probably free from the bug previously in lsl();
		* however, using roxl instead of rol in the same routines yields far more graphical glitches than expected (and than on TIEmu), so roxl was buggy as well.
		Fixing these instructions fixed both some non-deterministic floating-point computations (and therefore graphing) and ellipse drawing in AMS, see an entry from 2013/08/04.
	* on 2014/02/16, this emulator uncovered a 8+-year-old bug in TIEmu's emulation of Flash memory, namely the Identifier Codes (0x90) command. The bug probably went unnoticed because nobody bothered to execute the 89T HW4 boot code in TIEmu.
	  The 89T HW4 boot code uses the following sequence: write 0x90, read word from 800000, read word from 800002, write 0xFF.
	  The 89T OS uses another sequence: write 0x90, read word from 800000, read word from 800002, write 0x50, write 0xFF.
	  The code added by Kevin Kofler to flash.c on 2005/05/26, and modified no later than 2006/10/12, supported only the second, more commonly used variant.
*/

function TI68kEmulatorCoreModule(stdlib) {
"use strict";

var state = new Object();
state.version = 1;
// Registers
state.d0 = 0; // data registers, treat as 32 bit ints
state.d1 = 0;
state.d2 = 0;
state.d3 = 0;
state.d4 = 0;
state.d5 = 0;
state.d6 = 0;
state.d7 = 0;
state.a0 = 0; // address registers, treat as 32 bit ints
state.a1 = 0;
state.a2 = 0;
state.a3 = 0;
state.a4 = 0;
state.a5 = 0;
state.a6 = 0;
state.a7 = 0;
state.a8 = 0; // The currently unused stack pointer register, i.e. sp / ssp.
state.sr = 0; // status register, treat as 16 bit int
state.prev_pc = 0; // previous program counter, treat as 32 bit int
state.pc = 0; // program counter, treat as 32 bit int
state.pending_ints = 0;
state.address_error_access_type = 0;
state.address_error_address = 0;
state.current_instruction = 0;
state.reading_instruction = 0;

// Emulator arrays (rom is usually redefined elsewhere).
state.rom = false;
state.ram = new Uint16Array(131072); // 256K of RAM, treat as array of words
var cpu = new Object();
cpu.t = new Array(65536); // Instruction handlers.
cpu.n = new Array(65536); // Instruction names.
cpu.cycles = new Uint8Array(65536); // Instruction names.

// Emulator variables, part 1.
state.unhandled_count = 0; // number of unhandled instructions encountered
var main_interval_timer_id = 0; // interval ID of main timer
state.main_interval_timer_interval = 11; // interval value in ms of main timer, defaulting to 11 (~90 Hz screen refresh).
state.tracecount = 0; // number of instructions to trace in console
state.cycle_count = 0;
state.overall = 2500;
state.osc2_counter = 0;
state.frames_counted = 0;
state.total_time = 0;
var newromready = false;
var newfileready = false;
var newflashfileready = false;
var ui = false;
var link = false;
state.erase_ram_upon_reset = true;

// Hardware ports and variables deduced from them.
state.port_600000 = 0x04;
state.vectorprotect = false; // 0x600001
state.wakemask = 0; // 0x600005
state.lcd_address_high = 9; // 0x600010: stores LCD address / 8, corresponding to the default 0x4c00
state.lcd_address_low = 0x80; // 0x600011
state.lcd_address = 0x4c00; // 0x700017: LCD address deduced from snoop palette range.
state.screen_width = 240; // 0x600012
state.screen_height = 128; // 0x600013
state.interrupt_control = 0x1B; // 0x600015
state.interrupt_rate = 0x200; // deduced from 0x600015
state.timer_min = 0xB2; // 0x600017; 0xCC on HW2
state.timer_current = 0; // 0x600017
state.keystatus = new Uint8Array(80); // status of each key is at ROW * 8 + COLUMN
state.keymaskhigh = 0xFF; // 0x600018
state.keymasklow = 0xFF; // 0x600019: which key rows are selected to read
state.port_60001A = 0x02; // 0x60001A: ON key not pressed
state.port_60001B = 0; // 0x60001B
state.port_60001C = 0x01; // 0x60001C
state.port_60001D = 0x8D; // 0x60001D
state.port_700017 = 0; // 0x700017
state.port_70001D = 0; // 0x70001D
state.port_70001F = 0; // 0x70001F

// Emulator variables, part 2.
state.stopped = false;
state.hardware_model = 1; // Only HW1 is emulated at the moment anyway.
state.calculator_model = 1;
state.pedrom = false;
state.punix = false;
state.jmp_tbl = 0;
state.ROM_base = 0; // Deduced from calculator model
state.FlashMemorySize = 0;
state.large_flash_memory = false;
state.Protection_enabled = false; // The Protection with a capital P is not implemented, it slows down emulation.
var enable_kludge_in_lea_d_pc_a0 = true;
state.hex_prefix = "$";

// Flash memory state machine
state.flash_write_ready = 0;
state.flash_write_phase = 0x50;
state.flash_ret_or = 0;

// -------------------- Variables above this line should be saved and restored --------------------
function save_state()
{
	var state = new Object();
	state.apiversion = apiversion();
	state.emu = _save_state();
	state.link = link._save_state();
	state.ui = ui._save_state();
	// TODO store state somewhere.
}

function _save_state()
{
	var emustate = new Object();
	return emustate;
}

function restore_state(state)
{
	if (   typeof(state) === "object"
	    && typeof(state.emu) === "object"
	    && typeof(state.link) === "object"
	    && typeof(state.ui) === "object") {
		stdlib.clearInterval(main_interval_timer_id);

		if (state.emu.apiversion !== apiversion) {
			
		}

		_restore_state(state.emu);
		link._restore_state(state.link);
		ui._restore_state(state.ui);
	}
	else {
		
	}
}

function _restore_state(emustate)
{
	
}

var hex_digits = '0123456789ABCDEF';
function to_hex(number, digits)
{
	var s = "";
	if (number < 0)
	{
		number = -number;
		digits--;
		s = "-";
	}

	while (digits--)
	{
		var digit = number % 16;
		number = (number - digit) / 16;
		s = hex_digits[digit] + s;
	}
	return s;
}

function to_hex2(number, digits)
{
	var s = "";
	while (digits--)
	{
		var digit = number & 15;
		number = number >> 4;
		s = hex_digits[digit] + s;
	}
	return s;
}

// Dummy implementations, will be overridden later.
var rb_1_normal = function(address) { return 0x14; }
var rb_1_flashspecial = function(address) { return 0x14; }
var rw_1_normal = function(address) { return 0x1400; }
var rw_1_flashspecial = function(address) { return 0x1400; }
var wb_1_normal = function(address, value) { }
var ww_1_normal = function(address, value) { }
var ww_1_flashspecial = function(address, value) { }

var rb_3_normal = function(address) { return 0x14; }
var rb_3_flashspecial = function(address) { return 0x14; }
var rw_3_normal = function(address) { return 0x1400; }
var rw_3_flashspecial = function(address) { return 0x1400; }
var wb_3_normal = function(address, value) { }
var ww_3_normal = function(address, value) { }
var ww_3_flashspecial = function(address, value) { }

var rb_8_normal = function(address) { return 0x14; }
var rb_8_flashspecial = function(address) { return 0x14; }
var rw_8_normal = function(address) { return 0x1400; }
var rw_8_flashspecial = function(address) { return 0x1400; }
var wb_8_normal = function(address, value) { }
var ww_8_normal = function(address, value) { }
var ww_8_flashspecial = function(address, value) { }

var rb_9_normal = function(address) { return 0x14; }
var rb_9_flashspecial = function(address) { return 0x14; }
var rw_9_normal = function(address) { return 0x1400; }
var rw_9_flashspecial = function(address) { return 0x1400; }
var wb_9_normal = function(address, value) { }
var ww_9_normal = function(address, value) { }
var ww_9_flashspecial = function(address, value) { }

var rb = function(address) { return 0x14; }
var rw = function(address) { return 0x1400; }
var wb = function(address, value) { }
var ww = function(address, value) { }

function memory_dump(address, size, stride)
{
	address &= 0xFFFFFF;
	size &= 0xFFFFFF;
	stride &= 0xFFFFFF;
	var end = address + size;
	var str = to_hex(address, 6) + "\t";
	var i = 0;
	while (address < end)
	{
		if (i == stride) {
			str += "\n" + to_hex(address, 6) + "\t";
			i = 0;
		}
		str += to_hex(rb(address), 2) + " ";
		address++;
		i++;
	}
	
}

function ROM_CALL(id)
{
	id &= 0xFFFF;
	return rl(state.jmp_tbl + 4 * id);
}

// Special-casing for PedroM extracted from TIEmu, src/core/ti_sw/handles.c.
function HeapTable()
{
	// Are we dealing with an old version of PedroM ?
	if (state.pedrom && state.ram[0x30 >>> 1] <= 0x0080) {
		return rl(0x5d58);
	}
	else {
		if (ROM_CALL(-1) < 0x441 && !state.pedrom) { // TIOS_entries.
			// AMS 1.xx
			return rl(rw(ROM_CALL(0x96) + 8)); // Use word at HeapDeref + 8.
		}
		else {
			// AMS 2.xx, 3.xx, PedroM >= 0.81 (which still pretends to have fewer entries in the jump table than AMS 2.xx and 3.xx have).
			return ROM_CALL(0x441); // HeapTable.
		}
	}
}

function HeapDeref(id)
{
	id &= 0xFFFF;
	return rl(HeapTable() + 4 * id);
}

// Special-casing for PedroM extracted from TIEmu, src/core/ti_sw/handles.c.
function HeapSizeAddress(address)
{
	if (!state.pedrom) { // AMS
		// Read 2 bytes before addess, remove locked indication, subtract 1 byte, and multiply by 2.
		return ((rw(address - 2) & 0x7FFF) - 1) << 1;
	}
	else {
		if (address >= state.ROM_base) { // archived file: use file size
			return rw(address) + 2;
		}
		else {
			return rl(address - 6) - 6;
		}
	}
}

function HeapSize(id)
{
	id &= 0xFFFF;
	return HeapSizeAddress(rl(HeapTable() + 4 * id));
}

function PrintHeap()
{
	// 0 is an invalid HANDLE.
	var address = HeapTable() + 4;
	stdlib.console.log("0\tFFFFFF\tN/A");
	for (var i = 1; i < 2000; i++) {
		var handle = rl(address);
		if (handle != 0) {
			stdlib.console.log(i + "\t" + to_hex(handle, 6) + "\t" + to_hex(HeapSizeAddress(handle), 6));
		}
		address += 4;
	}
}

function disassemble_indexed_disp(disp)
{
	return ((disp & 0x8000) ? "A" : "D") + (((disp & 0x7000) >>> 12) & 0x7) + ((((disp & 0x0800) >>> 11) & 1) ? ".L" : ".W") + ")";
}

function disassemble_regs_mask(regs8, prefix)
{
	var str = "";
	var previous = 0;
	var current;
	var start = -1;
	var end = -1;
	var i;

	for (i = 0; i < 8; i++) {
		current = regs8 & 1;

		if (previous == 0 && current == 1) start = i;
		if (previous == 1 && current == 0) end = i - 1;

		if (start == end && start != -1) {
			str += prefix + (i - 1) + "/";
			end = -1; start = -1;
		}
		else if (end > start) {
			str += prefix + start + "-" + prefix + end + "/";
			end = -1; start = -1;
		}

		previous = current;
		regs8 >>>= 1;
	}

	end = i - 1;
	if (end > (start + 1) && start != -1) {
		str += prefix + start + "-" + end;
	}
	else if (start > 0 && end > 0) {
		str += prefix + start;
	}
	else {
		str = str.substring(0, str.length-1);
	}

	return str;
}

function disassemble_regs_predec_mask(regs8, prefix)
{
	var str = "";
	var previous = 0;
	var current;
	var start = -1;
	var end = -1;
	var i;

	for (i = 0; i < 8; i++) {
		current = (regs8 & (1 << 7)) >> 7;

		if (previous == 0 && current == 1) start = i;
		if (previous == 1 && current == 0) end = i - 1;

		if (start == end && start != -1) {
			str += prefix + (i - 1) + "/";
			end = -1; start = -1;
		}
		else if (end > start) {
			str += prefix + start + "-" + prefix + end + "/";
			end = -1; start = -1;
		}

		previous = current;
		regs8 <<= 1;
	}

	end = i - 1;
	if (end > (start + 1) && start != -1) {
		str += prefix + start + "-" + end;
	}
	else if (start > 0 && end > 0) {
		str += prefix + start;
	}
	else {
		str = str.substring(0, str.length-1);
	}

	return str;
}
 
// Data areas, such as 440000 on AMS 2.09 92+, are excellent mine fields :)
// TIEmu's disassembler is not perfect either, e.g. it disassembles:
// * CHK.L instructions, which exist only on 68020+ (at 440098 and 4401BC);
// * address register indexed with base displacement, which exist only on CPU32+ (at 440110 and 4401BE);
// * ORI.B #byte, CCR as ORI.B #word,SR (at 44017A).
//
// NOTE: this emulator handles address register / PC indexed with scale / base displacement / outer displacement as if there were none of those.
// At least for scale, that's what a 68000 is supposed to do, according to M68000PRM, page 2-21. It's less clear for bd / od (no mention on pages 2-22 and later).
// For the format of the second word in such instructions, see M68000PRM, page 2-2.
function disassemble(address, count)
{
	if (address & 1) {
		stdlib.console.log("Cowardly refusing to disassemble from an odd address");
		return;
	}

	while (count > 0) {
		var opcode = rw(address);
		var rawinstr = cpu.n[opcode];
		var orig_address = address;
		var leftside;
		var rightside;
		var idx = rawinstr.indexOf(",");
//stdlib.console.log("rawinstr:\t" + rawinstr);
		if (idx == -1) { // Single-operand instruction
			leftside = rawinstr;
			rightside = "";
		}
		else {
			leftside = rawinstr.substr(0, idx);
			rightside = rawinstr.substr(idx + 1);
		}
//stdlib.console.log("leftside:\t" + leftside);
//stdlib.console.log("rightside:\t" + rightside);
		address += 2;
		if (leftside != "") {
			if (leftside.indexOf("#xxxxxx") != -1) { // Immediate long value
				leftside = leftside.replace("#xxxxxx", "#" + state.hex_prefix + to_hex(rl(address), 8));
				address += 4;
			}
			else if (leftside.indexOf("#xxx") != -1) { // Immediate short value
				leftside = leftside.replace("#xxx", "#" + state.hex_prefix + to_hex(rw(address), 4));
				address += 2;
			}
			else if (leftside.indexOf("#xx") != -1) { // Immediate byte value
				leftside = leftside.replace("#xx", "#" + state.hex_prefix + to_hex(rw(address) & 0xFF, 2));
				address += 2;
			}
			else if (leftside.indexOf("xxx.W") != -1) { // Immediate short address
				leftside = leftside.replace("xxx.W", state.hex_prefix + to_hex(rw(address), 4) + ".W");
				address += 2;
			}
			else if (leftside.indexOf("xxx.L") != -1) { // Immediate long address
				leftside = leftside.replace("xxx.L", state.hex_prefix + to_hex(rl(address), 8) + ".L");
				address += 4;
			}
			else if (leftside.indexOf("d(A") != -1) { // address register with displacement
				var disp = rw(address);
				if (rightside.indexOf("Dn)") == 0) { // address register with displacement and index
					leftside = leftside.replace("d(A", state.hex_prefix + to_hex(disp & 0xFF, 2) + "(A");
					leftside += "," + disassemble_indexed_disp(disp); // Adjust left side
					rightside = rightside.substring(4); // Skip Dn),
				}
				else { 
					leftside = leftside.replace("d(A", state.hex_prefix + to_hex(disp, 4) + "(A");
				}
				address += 2;
			}
			else if (leftside.indexOf("d(PC") != -1) { // PC with displacement
				var disp = rw(address);
				if (rightside.indexOf("Dn)") == 0) { // PC with displacement and index
					leftside = leftside.replace("d(PC", state.hex_prefix + to_hex(disp & 0xFF, 2) + "(PC");
					leftside += "," + disassemble_indexed_disp(disp); // Adjust left side
					rightside = rightside.substring(4); // Skip Dn),
				}
				else {
					leftside = leftside.replace("d(PC", state.hex_prefix + to_hex(disp, 4) + "(PC");
				}
				address += 2;
			}
			else if (leftside.indexOf(".W disp") != -1) { // Branch word displacement
				var disp = rw(address) + 2;
				if (disp & 0x8000) {
					disp = 0x10000 - disp;
					leftside = leftside.replace("disp", "-" + state.hex_prefix + to_hex(disp, 4) + " [" + to_hex(orig_address - disp, 6) + "]");
				}
				else {
					leftside = leftside.replace("disp", "+" + state.hex_prefix + to_hex(disp, 4) + " [" + to_hex(orig_address + disp, 6) + "]");
				}
				address += 2;
			}
			else if (leftside.indexOf(".S disp") != -1) { // Branch short displacement
				var disp = (opcode & 0xFF) + 2;
				if (disp & 0x80) {
					disp = 0x100 - disp;
					leftside = leftside.replace("disp", "-" + state.hex_prefix + to_hex(disp, 2) + " [" + to_hex(orig_address - disp, 6) + "]");
				}
				else {
					leftside = leftside.replace("disp", "+" + state.hex_prefix + to_hex(disp, 2) + " [" + to_hex(orig_address + disp, 6) + "]");
				}
			}
			else if (leftside.indexOf("regspredec") != -1) { // Registers for movem from regs to memory, predecremented write
				// a7 is least significant bit.
				var regsan = rb(address + 1);
				var regsdn = rb(address);
				var str = "";
				if (regsdn != 0) {
					str = disassemble_regs_predec_mask(regsdn, "D");
					str += "/";
				}
				if (regsan != 0) {
					str += disassemble_regs_predec_mask(regsan, "A");
				}
				leftside = leftside.replace("regspredec", str);
				address += 2;
			}
			else if (leftside.indexOf("regs") != -1) { // Registers for movem from regs to memory, normal write
				// d0 is least significant bit.
				var regsdn = rb(address + 1);
				var regsan = rb(address);
				var str = "";
				if (regsdn != 0) {
					str = disassemble_regs_mask(regsdn, "D");
					str += "/";
				}
				if (regsan != 0) {
					str += disassemble_regs_mask(regsan, "A");
				}
				leftside = leftside.replace("regs", str);
				address += 2;
			}
		}

		if (rightside != "") {
			// Immediate values usually forbidden as dest ea, except for LINK
			if (rightside.indexOf("#xxx") != -1) { // Immediate short value
				rightside = rightside.replace("#xxx", "#" + state.hex_prefix + to_hex(rw(address), 4));
				address += 2;
			}
			else if (rightside.indexOf("xxx.W") != -1) { // Immediate short address
				rightside = rightside.replace("xxx.W", state.hex_prefix + to_hex(rw(address), 4) + ".W");
				address += 2;
			}
			else if (rightside.indexOf("xxx.L") != -1) { // Immediate long address
				rightside = rightside.replace("xxx.L", state.hex_prefix + to_hex(rl(address), 8) + ".L");
				address += 4;
			}
			else if (rightside.indexOf("d(A") != -1) { // address register with displacement
				//stdlib.console.log(leftside);
				//stdlib.console.log(rightside);
				var disp = rw(address);
				if (rightside.indexOf(",Dn)") != -1) { // address register with displacement and index
					rightside = rightside.replace("d(A", state.hex_prefix + to_hex(disp & 0xFF, 2) + "(A");
					rightside = rightside.replace("Dn)", disassemble_indexed_disp(disp));
				}
				else {
					rightside = rightside.replace("d(A", state.hex_prefix + to_hex(disp, 4) + "(A");
				}
				address += 2;
			}
			// PC with displacement is forbidden as dest ea (sadly, as it would be great for PC-relative / PIC programs...)
			else if (rightside.indexOf("disp") != -1) { // Branch short displacement for DBcc
				var disp = rw(address) + 2;
				if (disp & 0x8000) {
					disp = 0x10000 - disp;
					rightside = rightside.replace("disp", "-" + state.hex_prefix + to_hex(disp, 4) + " [" + to_hex(orig_address - disp, 6) + "]");
				}
				else {
					rightside = rightside.replace("disp", "+" + state.hex_prefix + to_hex(disp, 4) + " [" + to_hex(orig_address + disp, 6) + "]");
				}
				address += 2;
			}
			else if (rightside.indexOf("regs") != -1)  { // Registers for movem from memory to regs
				// d0 is least significant bit.
				var regsdn = rb(address + 1);
				var regsan = rb(address);
				var str = "";
				if (regsdn != 0) {
					str = disassemble_regs_mask(regsdn, "D");
					str += "/";
				}
				if (regsan != 0) {
					str += disassemble_regs_mask(regsan, "A");
				}
				rightside = rightside.replace("regs", str);
				address += 2;
			}

			stdlib.console.log(to_hex(orig_address, 6) + "\t" + leftside + "," + rightside);
		}
		else {
			stdlib.console.log(to_hex(orig_address, 6) + "\t" + leftside);
		}
		count--;
	}
}

// brief display of the system status
function print_status()
{
	stdlib.console.log('---')
	var opcode = rw(state.pc);
	
	var a = '';
	var d = '';
	for (var r = 0; r < 8; r++) {
		a += 'A' + r + '=' + to_hex(eval('state.a' + r), 9) + ' ';
		d += 'D' + r + '=' + to_hex(eval('state.d' + r), 9) + ' ';
	}
	stdlib.console.log(d);
	stdlib.console.log(a);
}

function print_status2()
{
	stdlib.console.log('---')
	var opcode = rw(state.pc);
	for (var r = 0; r < 8; r++) {
		stdlib.console.log('D' + r + '=' + to_hex(eval('state.d' + r), 9) + "\t" + 'A' + r + '=' + to_hex(eval('state.a' + r), 9));
	}
	stdlib.console.log('SR=' + to_hex(state.sr, 4) + "\tPC=" + to_hex(state.pc, 9));
	stdlib.console.log('T=' + ((state.sr & 0x8000) >>> 15) + "\tS=" + ((state.sr & 0x2000) >>> 13) + "\tM=" + ((state.sr & 0x1000) >>> 12) + "\tI=" + ((state.sr & 0x0700) >>> 8));
	stdlib.console.log('X=' + ((state.sr & 0x0010) >>>  4) + "\tN=" + ((state.sr & 0x0008) >>>  3) + "\tZ=" + ((state.sr & 0x0004) >>>  2) + "\tV=" + ((state.sr & 0x0002) >>> 1) + "\tC=" + (state.sr & 0x0001));
	
}

// sign extend functions

function ebw(value)
{
	value = value & 0xFF;
	return (value <= 0x7F) ? value : 0xFF00 + value;
}

function ewl(value)
{
	value = value & 0xFFFF;
	return (value <= 0x7FFF) ? value : 4294901760 /* 0xFFFF0000 */ + value;
}

// Functions to perform addition and subtraction and update the condition codes

function subw(subtrahend, minuend)
{
	subtrahend &= 0xFFFF;
	minuend &= 0xFFFF;
	var complement = 0x10000 - subtrahend;
	var result = complement + minuend;
	var maskedresult = result >= 0x10000 ? result - 0x10000 : result;
	state.sr &= 0xFFE0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 0x8000) state.sr += 8; // negative flag
	if (maskedresult < 0) maskedresult += 0x10000;
	if (complement < 0x8000 && minuend < 0x8000 && maskedresult >= 0x8000) state.sr += 2; // overflow flag
	if (complement >= 0x8000 && minuend >= 0x8000 && maskedresult < 0x8000) state.sr += 2; // overflow flag
	if (subtrahend > minuend) state.sr += 0x11; // carry and overflow
	return maskedresult;
}

function cmpw(subtrahend, minuend)
{
	subtrahend &= 0xFFFF;
	minuend &= 0xFFFF;
	var complement = 0x10000 - subtrahend;
	var result = complement + minuend;
	var maskedresult = result >= 0x10000 ? result - 0x10000 : result;
	state.sr &= 0xFFF0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 0x8000) state.sr += 8; // negative flag
	if (maskedresult < 0) maskedresult += 0x10000;
	if (complement < 0x8000 && minuend < 0x8000 && maskedresult >= 0x8000) state.sr += 2; // overflow flag
	if (complement >= 0x8000 && minuend >= 0x8000 && maskedresult < 0x8000) state.sr += 2; // overflow flag
	if (subtrahend > minuend) state.sr += 1; // carry and overflow
	return maskedresult;
}

function addw(x, y)
{
	x &= 0xFFFF;
	y &= 0xFFFF;
	var result = x + y;
	var maskedresult = result & 0xFFFF;
	state.sr &= 0xFFE0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 0x8000) state.sr += 8; // negative flag
	if (result != maskedresult) state.sr += 0x11; // carry and overflow
	if (y < 0x8000 && x < 0x8000 && maskedresult >= 0x8000) state.sr += 2; // overflow flag
	if (y >= 0x8000 && x >= 0x8000 && maskedresult < 0x8000) state.sr += 2; // overflow flag
	return maskedresult;
}

function subb(subtrahend, minuend)
{
	subtrahend &= 0xFF;
	minuend &= 0xFF;
	var complement = 0x100 - subtrahend;
	var result = complement + minuend;
	var maskedresult = result >= 0x100 ? result - 0x100 : result;
	state.sr &= 0xFFE0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 0x80) state.sr += 8; // negative flag
	if (maskedresult < 0) maskedresult += 0x100;
	if (complement < 0x80 && minuend < 0x80 && maskedresult >= 0x80) state.sr += 2; // overflow flag
	if (complement >= 0x80 && minuend >= 0x80 && maskedresult < 0x80) state.sr += 2; // overflow flag
	if (subtrahend > minuend) state.sr += 0x11; // carry and overflow
	return maskedresult;
}

function cmpb(subtrahend, minuend)
{
	subtrahend &= 0xFF;
	minuend &= 0xFF;
	var complement = 0x100 - subtrahend;
	var result = complement + minuend;
	var maskedresult = result >= 0x100 ? result - 0x100 : result;
	state.sr &= 0xFFF0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 0x80) state.sr += 8; // negative flag
	if (maskedresult < 0) maskedresult += 0x100;
	if (complement < 0x80 && minuend < 0x80 && maskedresult >= 0x80) state.sr += 2; // overflow flag
	if (complement >= 0x80 && minuend >= 0x80 && maskedresult < 0x80) state.sr += 2; // overflow flag
	if (subtrahend > minuend) state.sr += 1; // carry and overflow
	return maskedresult;
}

function addb(x, y)
{
	x &= 0xFF;
	y &= 0xFF;
	var result = x + y;
	var maskedresult = result & 0xFF;
	state.sr &= 0xFFE0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 0x80) state.sr += 8; // negative flag
	if (result != maskedresult) state.sr += 0x11; // carry and overflow
	if (y < 0x80 && x < 0x80 && maskedresult >= 0x80) state.sr += 2; // overflow flag
	if (y >= 0x80 && x >= 0x80 && maskedresult < 0x80) state.sr += 2; // overflow flag
	return maskedresult;
}

function subl(subtrahend, minuend)
{
	var complement = 4294967296 - subtrahend;
	var result = complement + minuend;
	var maskedresult = result >= 4294967296 ? result - 4294967296 : result;
	state.sr &= 0xFFE0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 2147483648) state.sr += 8; // negative flag
	if (maskedresult < 0) maskedresult += 4294967296;
	if (complement < 2147483648 && minuend < 2147483648 && maskedresult >= 2147483648) state.sr += 2; // overflow flag
	if (complement >= 2147483648 && minuend >= 2147483648 && maskedresult < 2147483648) state.sr += 2; // overflow flag
	if (subtrahend > minuend) state.sr += 0x11; // carry and overflow
	return maskedresult;
}

function cmpl(subtrahend, minuend)
{
	var complement = 4294967296 - subtrahend;
	var result = complement + minuend;
	var maskedresult = result >= 4294967296 ? result - 4294967296 : result;
	state.sr &= 0xFFF0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 2147483648) state.sr += 8; // negative flag
	if (maskedresult < 0) maskedresult += 4294967296;
	if (complement < 2147483648 && minuend < 2147483648 && maskedresult >= 2147483648) state.sr += 2; // overflow flag
	if (complement >= 2147483648 && minuend >= 2147483648 && maskedresult < 2147483648) state.sr += 2; // overflow flag
	if (subtrahend > minuend) state.sr += 1; // carry and overflow
	return maskedresult;
}

function addl(x, y)
{
	var result = x + y;
	var maskedresult = result >= 4294967296 ? result - 4294967296 : result;
	state.sr &= 0xFFE0;
	if (maskedresult == 0) state.sr += 4; // zero flag
	if (result & 2147483648) state.sr += 8; // negative flag
	if (result != maskedresult) state.sr += 0x11; // carry and overflow
	if (maskedresult < 0) maskedresult += 4294967296;
	if (x < 2147483648 && y < 2147483648 && maskedresult >= 2147483648) state.sr += 2; // overflow flag
	if (x >= 2147483648 && y >= 2147483648 && maskedresult < 2147483648) state.sr += 2; // overflow flag
	return maskedresult;
}

function sub(x, y, size)
{
	if (size == 0) return subb(x, y);
	if (size == 1) return subw(x, y);
	if (size == 2) return subl(x, y);
}

function cmp(x, y, size)
{
	if (size == 0) return cmpb(x, y);
	if (size == 1) return cmpw(x, y);
	if (size == 2) return cmpl(x, y);
}

function add(x, y, size)
{
	if (size == 0) return addb(x, y);
	if (size == 1) return addw(x, y);
	if (size == 2) return addl(x, y);
}

function abcd(x,y)
{
	var lowsum = (x & 0xF) + (y & 0xF);
	if (state.sr & 0x10) lowsum++; // carry in from the x register

	var carrymid = 0;
	if (lowsum >= 10) {
		lowsum -= 10;
		carrymid = 0x10;
	}

	var highsum = (x & 0xF0) + (y & 0xF0) + carrymid;
	state.sr &= 0xFFE4;
	if (highsum >= 0xA0) {
		highsum -= 0xA0;
		state.sr |= 0x11; // carry out into both X and C
	}
	var result = highsum + lowsum;
	if (result != 0) state.sr &= 0xFFFB; // zero flag
	return result;
}

function sbcd(dst,src)
{
	src &= 0xFF;
	dst &= 0xFF;
	var subtrahend = (src >>> 4) * 10 + (src & 0xF);
	var minuend = (dst >>> 4) * 10 + (dst & 0xF);
	var result = minuend - subtrahend;
	if (state.sr & 0x10) result--; // borrow from previous subtraction
	state.sr &= 0xFFE4; // clear all condition codes but Z
	if (result < 0) {
		result = result + 100;
		state.sr |= 0x11; // set carry and extend if we had a borrow.
	}
	if (result != 0) state.sr &= 0xFFFB; // clear zero flag
	var lowdigit = result % 10;
	var highdigit = (result - lowdigit) / 10;
	var finalresult = highdigit * 16 + lowdigit;
	return finalresult;
}

/*
// On TIEmu, the following test code

FILE *f = fopen("out", "wt");
if (f != NULL) {
    uint16_t i;
    for (i = 0; i < 0x100; i++) {
        uint16_t j = i;
        asm volatile("move.w %1,%0; andi.b #0,%%ccr; nbcd %0" : "=d" (j) : "d" (i) : "cc");
        fprintf(f, "%3d, ", j);
        if (i % 16 == 15) fprintf(f, "\n");
    }
    fprintf(f, "\n");
    fprintf(f, "\n");
    for (i = 0; i < 0x100; i++) {
        uint16_t j = i;
        asm volatile("move.w %1,%0; andi.b #0,%%ccr; ori.b #0x10,%%ccr; nbcd %0" : "=d" (j) : "d" (i) : "cc");
        fprintf(f, "%3d, ", j);
        if (i % 16 == 15) fprintf(f, "\n");
    }
    fprintf(f, "\n");
}
fclose(f);

f = fopen("out2", "wt");
if (f != NULL) {
    uint16_t i;
    for (i = 0; i < 0x100; i++) {
        uint16_t j = i;
        asm volatile("move.w %1,%0; andi.b #0,%%ccr; nbcd %0; scs %0" : "=d" (j) : "d" (i) : "cc");
        fprintf(f, "%3d, ", j);
        if (i % 16 == 15) fprintf(f, "\n");
    }
    fprintf(f, "\n");
    fprintf(f, "\n");
    for (i = 0; i < 0x100; i++) {
        uint16_t j = i;
        asm volatile("move.w %1,%0; andi.b #0,%%ccr; ori.b #0x10,%%ccr; nbcd %0; scs %0" : "=d" (j) : "d" (i) : "cc");
        fprintf(f, "%3d, ", j);
        if (i % 16 == 15) fprintf(f, "\n");
    }
    fprintf(f, "\n");
}
fclose(f);

produces

// X clear: (154 - x) modulo 255, with adjustments when the low digit of the input is zero.
  0, 153, 152, 151, 150, 149, 148, 147, 146, 145, 144, 143, 142, 141, 140, 139,
144, 137, 136, 135, 134, 133, 132, 131, 130, 129, 128, 127, 126, 125, 124, 123,
128, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107,
112, 105, 104, 103, 102, 101, 100,  99,  98,  97,  96,  95,  94,  93,  92,  91,
 96,  89,  88,  87,  86,  85,  84,  83,  82,  81,  80,  79,  78,  77,  76,  75,
 80,  73,  72,  71,  70,  69,  68,  67,  66,  65,  64,  63,  62,  61,  60,  59,
 64,  57,  56,  55,  54,  53,  52,  51,  50,  49,  48,  47,  46,  45,  44,  43,
 48,  41,  40,  39,  38,  37,  36,  35,  34,  33,  32,  31,  30,  29,  28,  27,
 32,  25,  24,  23,  22,  21,  20,  19,  18,  17,  16,  15,  14,  13,  12,  11,
 16,   9,   8,   7,   6,   5,   4,   3,   2,   1,   0, 255, 254, 253, 252, 251,
  0, 249, 248, 247, 246, 245, 244, 243, 242, 241, 240, 239, 238, 237, 236, 235,
240, 233, 232, 231, 230, 229, 228, 227, 226, 225, 224, 223, 222, 221, 220, 219,
224, 217, 216, 215, 214, 213, 212, 211, 210, 209, 208, 207, 206, 205, 204, 203,
208, 201, 200, 199, 198, 197, 196, 195, 194, 193, 192, 191, 190, 189, 188, 187,
192, 185, 184, 183, 182, 181, 180, 179, 178, 177, 176, 175, 174, 173, 172, 171,
176, 169, 168, 167, 166, 165, 164, 163, 162, 161, 160, 159, 158, 157, 156, 155,
// X set: (153 - x) modulo 255
153, 152, 151, 150, 149, 148, 147, 146, 145, 144, 143, 142, 141, 140, 139, 138,
137, 136, 135, 134, 133, 132, 131, 130, 129, 128, 127, 126, 125, 124, 123, 122,
121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106,
105, 104, 103, 102, 101, 100,  99,  98,  97,  96,  95,  94,  93,  92,  91,  90,
 89,  88,  87,  86,  85,  84,  83,  82,  81,  80,  79,  78,  77,  76,  75,  74,
 73,  72,  71,  70,  69,  68,  67,  66,  65,  64,  63,  62,  61,  60,  59,  58,
 57,  56,  55,  54,  53,  52,  51,  50,  49,  48,  47,  46,  45,  44,  43,  42,
 41,  40,  39,  38,  37,  36,  35,  34,  33,  32,  31,  30,  29,  28,  27,  26,
 25,  24,  23,  22,  21,  20,  19,  18,  17,  16,  15,  14,  13,  12,  11,  10,
  9,   8,   7,   6,   5,   4,   3,   2,   1,   0, 255, 254, 253, 252, 251, 250,
249, 248, 247, 246, 245, 244, 243, 242, 241, 240, 239, 238, 237, 236, 235, 234,
233, 232, 231, 230, 229, 228, 227, 226, 225, 224, 223, 222, 221, 220, 219, 218,
217, 216, 215, 214, 213, 212, 211, 210, 209, 208, 207, 206, 205, 204, 203, 202,
201, 200, 199, 198, 197, 196, 195, 194, 193, 192, 191, 190, 189, 188, 187, 186,
185, 184, 183, 182, 181, 180, 179, 178, 177, 176, 175, 174, 173, 172, 171, 170,
169, 168, 167, 166, 165, 164, 163, 162, 161, 160, 159, 158, 157, 156, 155, 154,

and
// Set C (and X) for all values but 0
  0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
// Set C (and X) for all values
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,

The implementation of nbcd in TIEmu (UAE) is as follows:
	uae_u16 lowdigit = - (src & 0xF) - (GET_XFLG ? 1 : 0);
	uae_u16 highdigit = - (src & 0xF0);
	uae_u16 newv, tmp_newv;
	int bcd = 0;
	newv = tmp_newv = highdigit + lowdigit;	if (lowdigit & 0xF0) { newv -= 6; bcd = 6; };
	if (((- (src & 0xFF) - (GET_XFLG ? 1 : 0)) & 0x100) > 0xFF) { newv -= 0x60; }
	SET_CFLG (((- (src & 0xFF) - bcd - (GET_XFLG ? 1 : 0)) & 0x300) > 0xFF);
COPY_CARRY;
	SET_ZFLG (GET_ZFLG & (((uae_s8)(newv)) == 0));
	SET_NFLG (((uae_s8)(newv)) < 0);
	SET_VFLG ((tmp_newv & 0x80) != 0 && (newv & 0x80) == 0);
*/
function nbcd(src)
{
	src &= 0xFF;
	var result;
	if (state.sr & 0x10) {
		result = 153 - src;
		if (result < 0) result += 256;
	}
	else {
		result = 154 - src;
		if (result < 0) result += 256;
		if (!(src & 0xF)) {
			result += 16;
			result &= 0xF0;
			if (result == 160 || result == 256) result = 0;
		}
	}
	state.sr &= 0xFFE4; // clear all condition codes but Z
	if (result & 0x80) state.sr |= 8; // Set N.
	if (result != 0) { state.sr &= 0xFFFB; state.sr |= 0x11; } // clear zero flag, set X and C
	return result;
}

function addx(x,y,size)
{
	var overflow = 0x100;
	if (size==1) overflow = 0x10000;
	if (size==2) overflow = 4294967296;
	var neg = overflow / 2;
	var result = x + y;
	if (state.sr & 0x10) result++; // carry in from X bit
	var maskedresult = result >= overflow ? result - overflow : result;
	state.sr &= 0xFFE0; // clear condition flags
	if (result == 0) state.sr |= 4; // set zero flag
	if (result & neg) state.sr += 8; // negative flag
	if (result != maskedresult) state.sr += 0x11; // carry and overflow
	if (maskedresult < 0) maskedresult += overflow;
	if (x < neg && y < neg && maskedresult >= neg) state.sr += 2; // overflow flag
	if (x >= neg && y >= neg && maskedresult < neg) state.sr += 2; // overflow flag
	return maskedresult;
}

function subx(x,y,size)
{
	var overflow = 0x100;
	if (size==1) overflow = 0x10000;
	if (size==2) overflow = 4294967296;
	var neg = overflow / 2;
	var result = y - x;
	if (state.sr & 0x10) result--; // carry in from X bit
	state.sr &= 0xFFE4; // clear condition flags but Z
	if (result < 0)
	{
		result += overflow;
		state.sr |= 0x11; // set X and C on carry out
	}
	if (result != 0) state.sr &= 0xFFBF; // clear zero flag
	if (result + result >= overflow) state.sr |= 8; // set negative flag
	if (x >= neg && y < neg && result >= neg) state.sr |= 2; // set overflow flag (positive minus negative giving negative)
	if (x < neg && y >= neg && result < neg) state.sr |= 2; // set overflow flag (negative minus positive giving positive)
	return result;
}

// Multiplication and division

function muls(x, y)
{
	x = x & 0xFFFF;
	y = y & 0xFFFF;
	if (x >= 0x8000) x -= 0x10000;
	if (y >= 0x8000) y -= 0x10000;
	var product = x * y;
	state.sr &= 0xFFF0; // clear all user flags but X
	if (product < 0) {
		product += 4294967296;
		state.sr |= 8; // negative flag
	}
	if (product == 0) state.sr |= 4; // zero flag
	return product;
}

function mulu(x, y)
{
	x = x & 0xFFFF;
	y = y & 0xFFFF;
	var product = x * y;
	state.sr &= 0xFFF0; // clear all user flags but X
	//product &= 0xFFFFFFFF;
	if (product >= 2147483648 /*0x80000000*/) state.sr |= 8; // negative flag
	if (product == 0) state.sr |= 4; // zero flag
	//stdlib.console.log("mulu pc=" + pc + "x=" + x + "y=" + y + "product=" + product);
	return product;
}

function divu(divisor, dividend)
{
	if (divisor == 0) fire_cpu_exception(5); // Divide by zero
	divisor &= 0xFFFF;
	var quotient = Math.floor(dividend / divisor) & 4294967295;
	var remainder = (dividend % divisor) & 0xFFFF;
	state.sr &= 0xFFF0; // clear all user flags but X
	if (quotient == 0) state.sr |= 4; // zero flag

	if (quotient & 4294901760) { // 0xFFFF0000
		// NOTE: M68000PRM indicates "N undefined when V".
		if (quotient >= 2147483648 /*0x80000000*/) state.sr |= 8; // negative
		state.sr |= 2; // overflow
		return dividend;
	}
	if (quotient > 0x10000 || remainder > 0x10000 || quotient < 0 || remainder < 0) stdlib.console.log("bad divide!");
	var result = quotient | (remainder << 16);
	if (result & 0x8000) state.sr |= 8; // negative flag
	if (result < 0) result += 4294967296;
	//result &= 0xFFFFFFFF;
	//stdlib.console.log("divu pc=" + pc + "dividend=" + dividend + "divisor=" + divisor + "result=" + result);
	return result;
}

function divs(divisor, dividend)
{
	//stdlib.console.log("signed divide " + to_hex(dividend,8) + " by " + to_hex(divisor,8));
	divisor &= 0xFFFF;
	if (divisor == 0) fire_cpu_exception(5); // Divide by zero

	var adivisor = divisor >= 0x8000 ? divisor - 0x10000 : divisor;
	var adividend = dividend >= 2147483648 /*0x80000000*/ ? dividend - 4294967296 : dividend;

	var quotient = Math.floor(adividend / adivisor) & 4294967295;
	var remainder = (adividend % adivisor) & 0xFFFF;

	//stdlib.console.log("decimal results : " + adividend + " divided by " + adivisor + " = " + quotient + " remainder " + remainder);

	state.sr &= 0xFFF0; // clear all user flags but X
	if (quotient >= 2147483648 /*0x80000000*/) state.sr |= 8; // negative flag
	if (quotient == 0) state.sr |= 4; // zero flag
	
	if (quotient >= 0x8000 || quotient < -32768) {
		if (quotient >= 2147483648 /*0x80000000*/) state.sr |= 8; // negative
		state.sr |= 2; // overflow
		return dividend;
	}

	if (quotient < 0) quotient += 0x10000;
	if (remainder < 0) remainder += 0x10000;

	var result = quotient + (remainder << 16);
	//stdlib.console.log("final result is " + to_hex(quotient + (remainder * 65536), 8));
	if (result < 0) result += 4294967296;

	return result;
}

// Functions to perform shifts and set the condition codes

// note - some of these should leave condition flags alone if shift count is 0

function lsl(x, shift, size)
{
	//if (shift == 0) stdlib.console.log ("LSL 0 at " + to_hex(pc, 6));

	var overflow = 0x100;
	if (size == 1) overflow = 0x10000;
	if (size == 2) overflow = 4294967296;
	var neg = overflow / 2;
	x &= overflow - 1;
	state.sr &= 0xFFF0; // initially clear all user condition flags but X
	while (shift > 0)
	{
		if (x & neg) state.sr |= 0x11; // set carry and extend if last bit shifted out is 1
		else state.sr &= 0xFFEE;
		x <<= 1;
		if (x >= overflow) {
			x -= overflow;
		}
		shift--;
	}
	x &= overflow - 1;
	if (x & neg) state.sr |= 8 // negative flag
	if (x == 0) state.sr |= 4; // zero flag
	return x;
}

function asl(x, shift, size)
{
	//if (shift == 0) stdlib.console.log ("ASL 0 at " + to_hex(pc, 6));

	var overflow = 0x100;
	if (size == 1) overflow = 0x10000;
	if (size == 2) overflow = 4294967296;
	var neg = overflow / 2;
	x &= overflow - 1;
	state.sr &= 0xFFE1; // initially clear all user condition flags but carry
	if (shift > 0) state.sr &= 0xFFE0; // clear carry if nonzero shift
	while (shift > 0)
	{
		if (x & neg) state.sr |= 0x11; // set carry and extend if last bit shifted out is 1
		else state.sr &= 0xFFEE;
		var old = x;
		x <<= 1;
		if (x >= overflow) {
			x -= overflow;
		}
		if ((x & neg) != (old & neg)) state.sr |= 2; // set overflow flag if high bit changed
		shift--;
	}
	x &= overflow - 1;
	if (x & neg) state.sr |= 8 // negative flag
	if (x == 0) state.sr |= 4; // zero flag
	return x;
}

function lsr(x, shift, size)
{
	//if (shift == 0) stdlib.console.log ("LSR 0 at " + to_hex(pc, 6));

	var overflow = 0x100;
	if (size == 1) overflow = 0x10000;
	if (size == 2) overflow = 4294967296;
	var neg = overflow / 2;
	x &= overflow - 1;
	state.sr &= 0xFFE0; // initially clear all user condition flags
	while (shift > 0)
	{
		if (x & 1) state.sr |= 0x11; // set carry and extend if last bit shifted out is 1
		else state.sr &= 0xFFEE;
		x >>>= 1;
		shift--;
	}
	x &= overflow - 1;
	if (x & neg) state.sr |= 8 // negative flag
	if (x == 0) state.sr |= 4; // zero flag
	return x;
}

function asr(x, shift, size)
{
	//if (shift == 0) stdlib.console.log ("ASR 0 at " + to_hex(pc, 6));

	var overflow = 0x100;
	if (size == 1) overflow = 0x10000;
	if (size == 2) overflow = 4294967296;
	var neg = overflow / 2;
	x &= overflow - 1;
	state.sr &= 0xFFF0; // initially clear all user condition flags but X
	if (shift > 0) state.sr &= 0xFFEF; // clear X if nonzero shift count
	while (shift > 0)
	{
		if (x & 1) state.sr |= 0x11; // set carry and extend if last bit shifted out is 1
		else state.sr &= 0xFFEE;
		if (x & neg) {
			x >>>= 1;
			x |= neg;
		}
		else {
			x >>>= 1;
		}
		shift--;
	}
	x &= overflow - 1;
	if (x & neg) state.sr |= 8 // negative flag
	if (x == 0) state.sr |= 4; // zero flag
	return x;
}

function ror(x, shift, size)
{
	//if (shift == 0) stdlib.console.log ("ROR 0 at " + to_hex(pc, 6));

	var overflow = 0x100;
	if (size == 1) overflow = 0x10000;
	if (size == 2) overflow = 4294967296;
	var neg = overflow / 2;
	x &= overflow - 1;
	state.sr &= 0xFFF0; // initially clear all user condition flags but X
	while (shift--)
	{
		var out = x & 1;
		x >>>= 1;
		if (out) x = x + neg;
	}
	x &= overflow - 1;
	if (x & neg) state.sr |= 0x9 // negative flag and carry flag
	if (x == 0) state.sr |= 4; // zero flag
	return x;
}

function rol(x, shift, size)
{
	//if (shift == 0) stdlib.console.log ("ROL 0 at " + to_hex(pc, 6));

	var overflow = 0x100;
	if (size == 1) overflow = 0x10000;
	if (size == 2) overflow = 4294967296;
	var neg = overflow / 2;
	x &= overflow - 1;
	state.sr &= 0xFFF0; // initially clear all user condition flags but X
	while (shift > 0)
	{
		if (x & neg) {
			x <<= 1;
			x++;
		}
		else {
			x <<= 1;
		}
		if (x >= overflow) {
			x -= overflow;
		}
		shift--;
	}
	x &= overflow - 1;
	if (x & neg) state.sr |= 0x8; // negative flag
	if (x & 1) state.sr |= 1; // carry flag
	if (x == 0) state.sr |= 4; // zero flag
	return x;
}

function roxr(x, shift, size)
{
	var overflow = 0x100;
	if (size == 1) overflow = 0x10000;
	if (size == 2) overflow = 4294967296;
	var neg = overflow / 2;
	x &= overflow - 1;
	while (shift--)
	{
		var out = x & 1;
		x >>>= 1;
		if (state.sr & 0x10) x = x + neg; // shift 1 in if X was set
		state.sr = state.sr & 0xFFE0; // clear all user condition flags including X
		if (out) state.sr += 0x10; // set X if bit shifted out was set
	}
	x &= overflow - 1;
	if (x & neg) state.sr |= 0x9 // negative flag and carry flag
	if (x == 0) state.sr |= 4; // zero flag
	if (state.sr & 0x10) state.sr |= 1; // carry flag gets a copy of the X flag
	return x;
}

function roxl(x, shift, size)
{
	var overflow = 0x100;
	if (size == 1) overflow = 0x10000;
	if (size == 2) overflow = 4294967296;
	var neg = overflow / 2;
	x &= overflow - 1;
	state.sr &= 0xFFF0; // initially clear all user condition flags but X
	while (shift > 0)
	{
		var old = x;
		x <<= 1;
		if (state.sr & 0x10) x = x + 1; // shift 1 in if X was set
		if (old & neg) {
			state.sr |= 0x10; // set X if bit was shifted out
		}
		else {
			state.sr &= 0xFFEF; // clear X
		}
		if (x >= overflow) {
			x -= overflow;
		}
		shift--;
	}
	x &= overflow - 1;
	if (x & neg) state.sr |= 0x8; // negative flag
	if (state.sr & 0x10) state.sr |= 1; // carry flag gets a copy of the X flag
	if (x == 0) state.sr |= 4; // zero flag
	return x;
}

function aline() { state.pc -= 2; fire_cpu_exception(10); } // A-Line
function fline() { state.pc -= 2; fire_cpu_exception(11); } // F-Line
function unhandled_instruction() { state.pc -= 2; fire_cpu_exception(4); } // Illegal / unhandled instruction.
/*stdlib.console.log("Unhandled instruction " + to_hex(current_instruction, 4) + " at address " + to_hex(pc - 2, 8));
//print_status();
unhandled_count++;*/

// update the status register in situations that might change S bit (flips A7)
function update_sr(new_sr)
{
	if ((new_sr ^ state.sr) & 0x2000)
	{
		var t = state.a7; // Switch between supervisor and user modes.
		state.a7 = state.a8;
		state.a8 = t;
	}
	state.sr = new_sr & 0xA71F; // Mask out bits which do not exist.
}

function an(reg)
{
	switch(reg) {
		case 0: return state.a0;
		case 1: return state.a1;
		case 2: return state.a2;
		case 3: return state.a3;
		case 4: return state.a4;
		case 5: return state.a5;
		case 6: return state.a6;
		case 7: return state.a7;
	}
}

function dn(reg)
{
	switch(reg) {
		case 0: return state.d0;
		case 1: return state.d1;
		case 2: return state.d2;
		case 3: return state.d3;
		case 4: return state.d4;
		case 5: return state.d5;
		case 6: return state.d6;
		case 7: return state.d7;
	}
}

var MODE_DREG = 0;
var MODE_AREG = 1;
var MODE_AREG_INDIRECT = 2;
var MODE_AREG_POSTINC = 3;
var MODE_AREG_PREDEC = 4;
var MODE_AREG_OFFSET = 5;
var MODE_AREG_INDEX = 6;
var MODE_MISC = 7;
var MISCMODE_SHORT = 0;
var MISCMODE_LONG = 1;
var MISCMODE_PC_OFFSET = 2;
var MISCMODE_PC_INDEX = 3;
var MISCMODE_IMM = 4; 

var instruction_list = ""

// insert into instruction table
function insert_inst(opcode, code, name)
{
	instruction_list += "cpu.t[" + opcode +"] = function() { " + code + "};";
	cpu.n[opcode] = name;
}

function insert_inst2(opcode, code, name, count)
{
	instruction_list += "cpu.t[" + opcode +"] = function() { " + code + "};";
	cpu.n[opcode] = name;
	cpu.cycles[opcode] = count;
}

// Check whether the given effective address is valid for common uses
function valid_source(mode, reg)
{
	return mode < 7 || reg <= 4
}

function valid_dest(mode, reg)
{
	return mode < 7 || reg <= 1
}

function valid_calc_effective_address(mode, reg)
{
	return mode == MODE_AREG_INDIRECT || mode == MODE_AREG_OFFSET || mode == MODE_AREG_INDEX || (mode == MODE_MISC && (reg <= 3))
}

// Return friendly name for a size
function size_name(size)
{
	if (size==0) return ".B"
	if (size==1) return ".W"
	return ".L"
}

function get_read(size)
{
	if (size == 0) return "rb"
	if (size == 1) return "rw"
	if (size == 2) return "rl"
}

function get_write(size)
{
	if (size == 0) return "wb"
	if (size == 1) return "ww"
	if (size == 2) return "wl"
}

// Return friendly text description of the addressing mode
function amode_name(mode, reg, size)
{
	if (mode==MODE_DREG) return "D" + (reg)
	if (mode==1) return "A" + (reg)
	if (mode==2) return "(A" + (reg) + ")"
	if (mode==3) return "(A" + (reg) + ")+"
	if (mode==MODE_AREG_PREDEC) return "-(A" + (reg) + ")"
	if (mode==5) return "d(A" + (reg) + ")"
	if (mode==6) return "d(A" + (reg) + ",Dn)"
	if (mode==7 && reg==0) return "xxx.W"
	if (mode==7 && reg==1) return "xxx.L"
	if (mode==7 && reg==2) return "d(PC)"
	if (mode==7 && reg==3) return "d(PC,Dn)"
	if (mode==7 && reg==4) {
		if (size == 0) return "#xx";
		else if (size == 1) return "#xxx";
		else if (size == 2) return "#xxxxxx";
	}
	return "unk"
}

function size_imm(size)
{
	if (size == 0) return " #xx,";
	else if (size == 1) return " #xxx,";
	else if (size == 2) return " #xxxxxx,";
	// else do nothing
}

// Generate code to read bytes after the pc into the specified variable.  Advances the PC unless the
// sideffects variable is set to false.
function read_pc(size, dest, sideeffects)
{
	if (size==0)
	{
		var code = "var " + dest + "=rb(state.pc+1);"
		return sideeffects ? code + "state.pc+=2;" : code
	}
	else if (size==1)
	{
		var code = "var " + dest + "=rw(state.pc);"
		return sideeffects ? code + "state.pc+=2;" : code
	}
	else if (size==2)
	{
		var code = "var " + dest + "=rl(state.pc);"
		return sideeffects ? code + "state.pc+=4;" : code
	}
}

// generate code to retrieve from memory by an addressing mode (into variable s)
function amode_read(mode, reg, size, sideeffects)
{
	var increment = size + 1; // pre-decrement / post-increment size
	if (increment == 3)  increment = 4;
	if (increment == 1 && reg == 7) increment = 2;

	// immediate
	if (mode == MODE_MISC && reg == MISCMODE_IMM)
		return read_pc(size, "s", sideeffects);
	//PC-relative
	if (mode == MODE_MISC && reg == MISCMODE_PC_OFFSET)
	{
		var code = read_pc(1, "o", sideeffects);
		code += "var a=state.pc+ewl(o)-2;"
		code += "var s=" + get_read(size) + "(a);"
		return code;
	}	
	// PC-relative indexed
	if (mode == MODE_MISC && reg == MISCMODE_PC_INDEX)
	{
		var code = read_pc(1, "e", sideeffects)
		code += "var a=e&0xFF;"
		code += "if(a>127)a-=256;"
		code += "a+=state.pc-2;"
		code += "var x=(e>>>12)&7;"
		code += "var y=(e>32767)?an(x):dn(x);"
		code += "if(!(e&0x800))y=ewl(y);"
		code += "var s=" + get_read(size) + "(y+a);"
		return code;
	}
	// Absolute long
	if (mode == MODE_MISC && reg == MISCMODE_LONG)
	{
		code = read_pc(2, "a", sideeffects)
		code += "var s=" + get_read(size) + "(a);"
		return code;
	}
	// Absolute short
	if (mode == MODE_MISC && reg == MISCMODE_SHORT)
	{
		code = read_pc(1, "a", sideeffects)
		code += "var s=" + get_read(size) + "(ewl(a));"
		return code;
	}
	// address register indirect
	if (mode == MODE_AREG_INDIRECT)
	{
		return "var s=" + get_read(size) + "(state.a" + reg + ");"
	}
	// address register indirect with postincrement 
	if (mode == MODE_AREG_POSTINC)
	{
		var code = "var s=" + get_read(size) + "(state.a" + reg + ");" 
		if (sideeffects) code += "state.a" + reg + "+=" + increment + ";"
		return code;
	}
	// address register indirect with predecrement
	if (mode == MODE_AREG_PREDEC)
	{
		if (sideeffects)
			return "state.a" + reg + "-=" + increment + ";" + "var s=" + get_read(size) + "(state.a" + reg + ");" 
		else
			return "var s=" + get_read(size) + "(state.a" + reg + "-" + increment + ");" 
	}
	// address register indirect with offset
	if (mode == MODE_AREG_OFFSET)
	{
		var code = read_pc(1, "o", sideeffects)
		code += "var a=state.a" + reg + "+ewl(o);"
		code += "var s=" + get_read(size) + "(a);"
		return code;
	}
	// address register indirect with indexing
	if (mode == MODE_AREG_INDEX)
	{
		var code = read_pc(1, "e", sideeffects)
		code += "var a=e&255;"
		code += "if (a>=128)a-=256;"
		code += "a+=state.a" + reg + ";"
		code += "var x=(e>>>12)&7;"
		code += "var y=(e>32767)?an(x):dn(x);"
		code += "if(!(e&0x800))y=ewl(y);"
		code += "var s=" + get_read(size) + "(y+a);"
		return code
	}
	// Data register direct
	if (mode == MODE_DREG)
	{
		if (size == 0)
			return "var s=state.d" + reg + "&255;"
		if (size == 1)
			return "var s=state.d" + reg + "&65535;"
// The two if are _really_ important for AMS 2.03 92+ to boot.
		if (size == 2)
			return "var s=state.d" + reg + "; if(s<0)s+=4294967296; if(s>4294967295)s-=4294967296;"
	}
	// a register direct
	if (mode == MODE_AREG)
	{
		if (size == 1)
			return "var s=state.a" + reg + "&65535;"
// The two if are _really_ important for AMS 2.03 92+ to boot.
		if (size == 2)
			return "var s=state.a" + reg + "; if(s<0)s+=4294967296; if(s>4294967295)s-=4294967296;"
	}
	return "fire_cpu_exception(4);"; // Illegal instruction
}

function effective_address_calc(mode, reg)
{
	var code = "fire_cpu_exception(4);" // Illegal instruction
	// PC-relative
	if (mode == MODE_MISC && reg == MISCMODE_PC_OFFSET)
	{
		code = read_pc(1, "o", true)
		code += "var z=state.pc-2+ewl(o);"
		code += "if(z>4294967295)z-=4294967296;"
	}
	// PC-relative indexed
	if (mode == MODE_MISC && reg == MISCMODE_PC_INDEX)
	{
		code = read_pc(1, "e", true)
		code += "var a=e&0xFF;"
		code += "if(a>127)a-=256;"
		code += "a+=state.pc-2;"
		code += "var x=(e>>>12)&7;"
		code += "var y=(e>32767)?an(x):dn(x);"
		code += "if (!(e&0x800))y=ewl(y);"
		code += "var z=y+a;"
		code += "if(z>4294967295)z-=4294967296;"
	}
	// address register indirect with indexing
	if (mode == MODE_AREG_INDEX)
	{
		code = read_pc(1, "e", true)
		code += "var a = e&0xFF;"
		code += "if(a>127)a-=256;"
		code += "a+=state.a" + reg + ";"
		code += "var x=(e>>>12)&7;"
		code += "var y=(e>32767)?an(x):dn(x);"
		code += "if (!(e&0x800))y=ewl(y);"
		code += "var z=y+a;"
		code += "if(z>4294967295)z-=4294967296;"
	}
	// Absolute long
	if (mode == MODE_MISC && reg == MISCMODE_LONG)
		code = read_pc(2, "z", true)
	// Absolute short
	if (mode == MODE_MISC && reg == MISCMODE_SHORT)
	{
		code = read_pc(1, "z", true)
		code += "z=ewl(z);"
	}
	// address register indirect with offset
	if (mode == MODE_AREG_OFFSET)
	{
		code = read_pc(1, "o", true)
		code += "var z=state.a" + reg + "+ewl(o);"
		code += "if(z>4294967295)z-=4294967296;"
	}
	// address register indirect
	if (mode == MODE_AREG_INDIRECT)
		code = "var z=state.a" + reg + ";"
	return code
}

// generate code to set condition flags based on a value
function set_condition_flags_data(size, s)
{
	var code = "state.sr &= 65520;" // clear negative, zero, overflow, carry
	code += "if(" + s + "==0) state.sr += 4;" // set zero flag
	if (size == 0) return code + "if(" + s + "&128) state.sr += 8;" // set negative flag
	if (size == 1) return code + "if(" + s + "&32768) state.sr += 8;" // set negative flag
	if (size == 2) return code + "if(" + s + "&2147483648) state.sr += 8;" // set negative flag
}

// generate code to write the data to the effective a specified by mode and reg of size size
function amode_write(mode, reg, size, data)
{
	var increment = size + 1; // pre-decrement / post-increment size
	if (increment == 3)  increment = 4;
	if (increment == 1 && reg == 7) increment = 2; // Special case: move.b <ea>,-(sp)
	
	// Absolute long
	if (mode == MODE_MISC && reg == MISCMODE_LONG)
		return "var addr = rl(state.pc); state.pc += 4; " + get_write(size) + "(addr," + data + ");"
	// Absolute short
	if (mode == MODE_MISC && reg == MISCMODE_SHORT)
		return "var addr = ewl(rw(state.pc)); state.pc += 2; " + get_write(size) + "(addr," + data + ");"
	// address register direct
	if (mode == MODE_AREG)
	{
		if (size == 2)
			return "state.a" + reg + "=" + data + "&4294967295;" // if(a" + reg + "<0)a" + reg + "=4294967296; if(a" + reg + ">4294967295)a" + reg + "-=4294967296;"
		if (size == 1)
			return "state.a" + reg + "=ewl(" + data + ")&4294967295;" // if(a" + reg + "<0)a" + reg + "=4294967296; if(a" + reg + ">4294967295)a" + reg + "-=4294967296;"
	}
	// address register indirect
	if (mode == MODE_AREG_INDIRECT)
		return get_write(size)+"(state.a" + reg + "," + data + ");"
	// address register indirect with postincrement 
	if (mode == MODE_AREG_POSTINC)
		return get_write(size)+"(state.a" + reg + "," + data + "); state.a" + reg + "+=" + increment + ";"
	// address register indirect with predecrement
	if (mode == MODE_AREG_PREDEC) {
		return "state.a" + reg + "-=" + increment + "; " + get_write(size) + "(state.a" + reg + "," + data + ");"
	}
	// adress register indirect with offset
	if (mode == MODE_AREG_OFFSET)
		return read_pc(1, "o", true) + get_write(size) + "(state.a" + reg + "+ewl(o)," + data + ");"
	// address register indirect with indexing
	if (mode == MODE_AREG_INDEX)
	{
		var code = read_pc(1, "e", true)
		code += "var a=e%256;"
		code += "if(a>127)a-=256;"
		code += "a+=state.a" + reg + ";"
		code += "var x=(e>>>12)&7;"
		code += "var y=(e>32767)?an(x):dn(x);"
		code += "if(!(e&0x800))y=ewl(y);"
		code += get_write(size)+"(a+y," + data + ");"
		return code;
	}
	// Data register direct
	if (mode == MODE_DREG)
	{
		if (size == 2)
			return "state.d" + reg + "=" + data + "&4294967295;" // if(d" + reg + "<0)d" + reg + "=4294967296; if(d" + reg + ">4294967295)d" + reg + "-=4294967296;"
		if (size == 0)
			return "state.d" + reg + "=((state.d" + reg + ">>>8)*256)+(" + data + "&255);"
		if (size == 1)
			return "state.d" + reg + "=((state.d" + reg + ">>>16)*65536)+(" + data + "&65535);"
	}
	return "fire_cpu_exception(4);" // Illegal Instruction
}

// Extracted from 68000UM, table 8.1.
function effective_address_calculation_time(mode, reg, size)
{
	if (mode == MODE_DREG || mode == MODE_AREG) {
		return 0;
	}
	if (mode == MODE_AREG_INDIRECT) {
		return (size != 2) ? 4 : 8;
	}
	if (mode == MODE_AREG_POSTINC) {
		return (size != 2) ? 4 : 8;
	}
	if (mode == MODE_AREG_PREDEC) {
		return (size != 2) ? 6 : 10;
	}
	if (mode == MODE_AREG_OFFSET) {
		return (size != 2) ? 8 : 12;
	}
	if (mode == MODE_AREG_INDEX) {
		return (size != 2) ? 10 : 14;
	}
	if (mode == MODE_MISC) {
		if (reg == MISCMODE_SHORT) {
			return (size != 2) ? 8 : 12;
		}
		if (reg == MISCMODE_LONG) {
			return (size != 2) ? 12 : 16;
		}
		if (reg == MISCMODE_PC_OFFSET) {
			return (size != 2) ? 8 : 12;
		}
		if (reg == MISCMODE_PC_INDEX) {
			return (size != 2) ? 10 : 14;
		}
		if (reg == MISCMODE_IMM) {
			return (size != 2) ? 4 : 8;
		}
	}

	return 0;
}

// generate code for MOVEQ instructions
function build_moveq()
{
	for (var data = 0; data <= 255; data++) {
		for (var reg = 0; reg < 8; reg++) {
			var opcode = 0x7000 + (reg << 9) + data;
			var code = "state.sr &= 65520;"; // clear all flags (except X)
			code += "state.d" + reg + " = ";
			if (data < 128) {
				code += data + "; ";
				if (data == 0)
					code += "state.sr |= 4;"; // set zero flag
			}
			else 
				code += (data + 0xFFFFFF00) + "; state.sr |= 8; ";
			insert_inst2(opcode, code, "MOVEQ #" + state.hex_prefix + (data >= 128 ? to_hex(data - 256, 2) : to_hex(data, 2)) + ",D" + reg, 4);
		}
	}
}

// build executors for ADDQ and SUBQ
function build_addsubq()
{
	for (var offset = -8; offset < 9; offset++) {
		if (offset != 0) {
			for (var mode = 0; mode < 8; mode++) {
				for (var reg = 0; reg < 8; reg++) {
					for (var size = 0; size < 3; size++) {
						// do not allow add/subtract of byte from address register, or add/subtract of 0
						if (valid_dest(mode, reg) && (mode != MODE_AREG || size != 0))
						{
							var name = "";
							var opcode = 0;
							if (offset > 0)
							{
								opcode = 0x5000 + (offset << 9)
								if (offset == 8) opcode = 0x5000
								opcode += (size << 6) + (mode << 3) + reg
								name = "ADDQ" + size_name(size) + " #" + offset + "," + amode_name(mode, reg, 0)
							}
							else
							{
								opcode = 0x5100 + ((-offset) << 9)
								if (offset == -8) opcode = 0x5100
								opcode += (size << 6) + (mode << 3) + reg
								name = "SUBQ" + size_name(size) + " #" + (-offset) + "," + amode_name(mode, reg, 0)
							}
							var actualsize = (mode == MODE_AREG) ? 2 : size; // for address registers, always treat as long
							var cost = (size == 2) ? (((mode == MODE_DREG) || (mode == MODE_AREG)) ? 4 : 8)
									       : (((mode == MODE_DREG) || (mode == MODE_AREG)) ? 8 : 12);
							var code = amode_read(mode, reg, actualsize, false);
							if (mode == MODE_AREG) 
							{
								// for address registers we don't set condition codes and thus can use a much simpler operation
								code += "var r=s+" + offset + ";"
								if (offset < 0) code += "if(r<0)r+=4294967296;"
								if (offset > 0) code += "if(r>4294967295)r-=4294967296;" // was state.pc ???
							}
							else
							{
								// regular arithmetic with condition flags set for every other destination
								if (size == 0 && offset < 0)
									code +=  "var r=subb(" + (-offset) + ", s);" 
								if (size == 0 && offset > 0)
									code +=  "var r=addb(" + offset + ", s);" 
								if (size == 1 && offset < 0)
									code +=  "var r=subw(" + (-offset) + ", s);" 
								if (size == 1 && offset > 0)
									code +=  "var r=addw(" + offset + ", s);" 
								if (size == 2 && offset < 0)
									code +=  "var r=subl(" + (-offset) + ", s);" 
								if (size == 2 && offset > 0)
									code +=  "var r=addl(" + offset + ", s);" 
								// copy carry flag into X flag
								code += "state.sr = (state.sr&0xFFEF)|((state.sr&1)<<4);"
							}
							code += amode_write(mode, reg, actualsize, "r")
							insert_inst2(opcode, code, name, cost + effective_address_calculation_time(mode, reg, size));
						}
					}
				}
			}
		}
	}
}

// build all the branches for the given condition, name, and bits
function build_conditionals(condition, name, bits)
{
	var bcc_opcode = 0x6000 + (bits << 8)
	var dbcc_opcode = 0x50C8 + (bits << 8)
	var scc_opcode = 0x50C0 + (bits << 8)
	// Bcc
	for (var o = 0; o < 256; o++) {
		var opcode = bcc_opcode + o;
		var iname = "B" + name;
		var cost = 10;
		if (iname == "BT") {
			iname = "BRA";
		}
		if (iname == "BF") {
			iname = "BSR";
			cost = 18;
		}
		if (o == 0) {
			iname = iname + ".W disp";
		}
		else {
			iname = iname + ".S disp";
		}
		var code = "";
		if (o == 0)
		{
			// Branch using word displacement.
			code = "var o=rw(state.pc);"
			if (name == "F")
			{
				code += amode_write(4, 7, 2, "(state.pc+2)")
				code += "if(true) {"
			}
			else
			{
				code += condition + "{";
			}
			code += "state.pc+=ewl(o);";
			code += "if(state.pc>4294967295)state.pc-=4294967296;";
			code += "}";
			code += "else {";
			code += "state.pc += 2; state.cycle_count += 2;"; // Word branches are slower if not taken.
			code += "}";
		}
		else
		{
			// Branch using byte displacement.
			if (name == "F")
				code = amode_write(4, 7, 2, "state.pc")
			else
				code += condition + "{";
			if (o < 128)
				code +=  "state.pc+=" + o + ";"
			else
				code +=  "state.pc-=" + (256 - o) + ";"
			if (name != "F") {
				code += "}";
				code += "else {";
				code += "state.cycle_count -= 2;"; // Short branches are faster if not taken.
				code += "}";
			}
		}
		insert_inst2(opcode, code, iname, cost)
	}

	// DBcc
	for (var reg = 0; reg < 8; reg++) {
		var opcode = dbcc_opcode + reg
		var cost = 10;
		var code = condition + "{ state.pc += 2; state.cycle_count += 2; } else {"
		code += "var p=state.d" + reg + ";"
		code += "var u=(p>>>16)*65536;"
		code += "var l=p%65536;"
		code += "var m=(l - 1)&65535;"
		code += "state.d" + reg + "=u+m;"
		code += "if(m==65535) {"
		code += "state.pc+=2; state.cycle_count += 4;"
		code += "} else {"
		code += "state.pc=(state.pc+ewl(rw(state.pc)))%4294967296;}"
		code += "}"
		insert_inst2(opcode, code, "DB" + name + " D" + reg + ",disp", cost)
	}

	// Scc
	for (var reg = 0; reg < 8; reg++) {
		for (var mode = 0; mode < 8; mode++) {
			if (valid_dest(mode, reg) && mode != 1)
			{
				var opcode = scc_opcode + reg + (mode << 3)
				var cost = (mode == MODE_DREG) ? 4 : 8;
				var code = condition + "{"
				code += amode_write(mode, reg, 0, "255");
				if (mode == MODE_DREG) code += "state.cycle_count += 2;"
				code += "} else {"
				code += amode_write(mode, reg, 0, "0")
				code += "}"
				insert_inst2(opcode, code, "S" + name + " " + amode_name(mode, reg, 0), cost + effective_address_calculation_time(mode, reg, 0))
			}
		}
	}
}

// generate standard MOVE instructions
function build_moves(name, size, pattern)
{
	for (var srcmode = 0; srcmode < 8; srcmode++) {
		for (var srcreg = 0; srcreg < 8; srcreg++) {
			for (var dstmode = 0; dstmode < 8; dstmode++) {
				if (size == 0 && (dstmode == 1 || srcmode == 1)) continue; // no byte moves from and to address registers
				for (var dstreg = 0; dstreg < 8; dstreg++) {
					if (valid_source(srcmode, srcreg) && valid_dest(dstmode, dstreg))
					{
						var opcode = pattern + (dstreg << 9) + (dstmode << 6) + (srcmode << 3) + srcreg
						var fullname = ((dstmode == 1) ? name.replace("MOVE", "MOVEA") : name) + " " + amode_name(srcmode, srcreg, size) + "," + amode_name(dstmode, dstreg, size)
						var code = amode_read(srcmode, srcreg, size, true)
						code += amode_write(dstmode, dstreg, size, "s")
						// set condition codes, except when writing to a registers
						if (dstmode != MODE_AREG) {
							code += set_condition_flags_data(size, "s")
						}
						insert_inst2(opcode, code, fullname, 4 + effective_address_calculation_time(srcmode, srcreg, size) + effective_address_calculation_time(dstmode, dstreg, size))
					}
				}
			}
		}
	}
}

function build_movep()
{
	// TODO: emulate this instruction properly instead of a 4-byte NOP.
	// From memory to register
	for (var opmode = 4; opmode < 6; opmode++) {
		for (var areg = 0; areg < 8; areg++) {
			for (var dreg = 0; dreg < 8; dreg++) {
				var opcode = 0x0008 + (dreg << 9) + (opmode << 6) + areg
				var fullname = "MOVEP" + ((opmode & 1) ? ".L " : ".W ") + "d(A" + areg + "),D" + dreg;
				var code = "state.pc += 2" // TODO
				// condition codes not affected.
				insert_inst2(opcode, code, fullname, ((opmode & 1) ? 24 : 16))
			}
		}
	}

	// From register to memory
	for (var opmode = 6; opmode < 8; opmode++) {
		for (var areg = 0; areg < 8; areg++) {
			for (var dreg = 0; dreg < 8; dreg++) {
				var opcode = 0x0008 + (dreg << 9) + (opmode << 6) + areg
				var fullname = "MOVEP" + ((opmode & 1) ? ".L " : ".W ") + "D" + dreg + ",d(A" + areg + ")"
				var code = "state.pc += 2" // TODO
				// condition codes not affected.
				insert_inst2(opcode, code, fullname, ((opmode & 1) ? 24 : 16))
			}
		}
	}
}

// perform a standard operation of given size between given source and dest
function build_operation(name, size, source, dest)
{
	var code = "";
	if (size == 0 && name == "ADD") code = "var r=addb(" + source + "," + dest + ");"
	if (size == 1 && name == "ADD") code = "var r=addw(" + source + "," + dest + ");"
	if (size == 2 && name == "ADD") code = "var r=addl(" + source + "," + dest + ");"
	if (size == 0 && name == "SUB") code = "var r=subb(" + source + "," + dest + ");"
	if (size == 1 && name == "SUB") code = "var r=subw(" + source + "," + dest + ");"
	if (size == 2 && name == "SUB") code = "var r=subl(" + source + "," + dest + ");"
	if (name == "OR") code += "var r=" + source + "|" + dest+ ";"
	if (name == "AND") code += "var r=" + source + "&" + dest+ ";"
	if (name == "EOR") code += "var r=" + source + "^" + dest+ ";"
	if (name == "OR" || name == "AND" || name == "EOR")
	{
		code += "if(r<0)r+=4294967296;"
		if (size == 0) code += "r&=255;"
		if (size == 1) code += "r&=65535;"
		code += set_condition_flags_data(size, "r")
	}
	return code;
}

// build standard calculation operations
function build_calc(name, bits)
{
	for (var dreg = 0; dreg < 8; dreg++) {
		for (var reg = 0; reg < 8; reg++) {
			for (var mode = 0; mode < 8; mode++) {
				for (var size = 0; size < 3; size++) {
					var opcode = bits + (dreg << 9) + (size << 6) + (mode << 3) + reg
					// generate version with EA as source
					if (valid_source(mode, reg) && name != "EOR") // EA as source does work for EOR
					{
						var iname = name + size_name(size) + " " + amode_name(mode, reg, size) + ",D" + dreg
						var code = amode_read(mode, reg, size, true)
						var cost = 4;
						if (size == 2) {
							cost += 2;
							if (mode == MODE_DREG || (mode == MODE_MISC && reg == MISCMODE_IMM)) {
								cost += 2;
							}
						}
						code += build_operation(name, size, "s", "state.d" + dreg + "")
						code += amode_write(MODE_DREG, dreg, size, "r")
						insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(mode, reg, size))
					}
					//  generate version with EA as destination
					if (valid_dest(mode, reg) && (mode != MODE_DREG || name == "EOR") && mode != MODE_AREG) //EA as dest does not work for registers
					{
						opcode = opcode + 0x100
						var iname = name + size_name(size) + " D" + dreg + "," + amode_name(mode, reg, size)
						var code = amode_read(mode, reg, size, false)
						var cost = (size == 2) ? 12 : 8;
						code += build_operation(name, size, "state.d" + dreg, "s")
						code += amode_write(mode, reg, size, "r")
						insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(mode, reg, size))
					}
				}
			}
		}
	}
}

// build multiply and divide
function build_muldiv(name, bits, calcfunc, cost)
{
	for (var dreg = 0; dreg < 8; dreg++) {
		for (var mode = 0; mode < 8; mode++) {
			for (var reg = 0; reg < 8; reg++) {
				if (valid_source(mode, reg) && mode != MODE_AREG) {
					var opcode = bits + (dreg << 9) + (mode << 3) + reg
					var iname = name + " " + amode_name(mode, reg, 1) + ",D" + dreg
					var code = amode_read(mode, reg, 1, true)
					code += "state.d" + dreg + " = " + calcfunc + "(s,state.d" + dreg +");";
//					code += "if(d" + dreg + "<0)d" + dreg + "+=4294967296; if(d" + dreg + ">4294967295)d" + dreg + "-=4294967296;"
					insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(mode, reg, 1))
				}
			}
		}
	}
}

// build a bit operation
function build_bit_operation(name, bits, registercost, memorycost)
{
	for (var srcmode = 0; srcmode < 8; srcmode++) {
		for (var srcreg = 0; srcreg < 8; srcreg++) {
			if (srcmode != 1 && (valid_dest(srcmode, srcreg) || // No bit operations to address registers.
				(name == 'BTST' && srcmode == MODE_MISC && 
				(srcreg == MISCMODE_PC_OFFSET || srcreg == MISCMODE_PC_INDEX)))) {
				for (var dreg = 0; dreg <= 8; dreg++) // if this value is 8, use bit number static version
				{
					var opcode, iname, code = "";
					if (dreg == 8)
					{
						opcode = bits + (srcmode << 3) + srcreg;
						iname = name + " #xxx," + amode_name(srcmode, srcreg, 0)
					}
					else
					{
						opcode = bits + (srcmode << 3) + srcreg - 0x700 + (dreg << 9);
						iname = name + " D" + dreg + "," + amode_name(srcmode, srcreg, 0)
					}
					if (dreg == 8)
						code = read_pc(1, "b", true)
					if (srcmode <= 1)
					{
						// immediate on a register allows using bits 0-31 of the register's full value
						if (dreg == 8)
							code += "b&=31;"
						else
							code += "var b=31&state.d" + dreg +";"
						code += amode_read(srcmode, srcreg, 2, name == "BTST")
					}
					else
					{
						//  immediate elsewhere uses one byte bits 0-7
						if (dreg == 8)
							code += "b&=7;"
						else
							code += "var b=7&state.d" + dreg +";"
						code += amode_read(srcmode, srcreg, 0, name == "BTST")
					}
					code += "state.sr|=4;" // set zero flag
					code += "if (s&(1<<b))state.sr=state.sr&65531;" // clear zero flag if bit is set (nonzero)
					if (name != "BTST")
					{
						if (srcmode <= 1)
						{
							// BCLR immediate on a register allows using bits 0-31 of the register's full value
							if (name == "BCLR") code += "s&=(4294967295-(1<<b));"
							if (name == "BSET") code += "s|=(1<<b);"
							if (name == "BCHG") code += "s^=(1<<b);"
							code += "if(s<0)s+=4294967296;"
							code += amode_write(srcmode, srcreg, 2, "s")
						}
						else
						{
							// BCLR immediate elsewhere uses one byte bits 0-7
							if (name == "BCLR") code += "s&=(255-(1<<b));"
							if (name == "BSET") code += "s|=(1<<b);"
							if (name == "BCHG") code += "s^=(1<<b);"
							code += amode_write(srcmode, srcreg, 0, "s")
						}
					}
					insert_inst(opcode, code, iname)
				}
			}
		}
	}
}

function build_cmp()
{
	for (var size = 0; size < 3; size++) {
		for (var srcmode = 0; srcmode < 8; srcmode++) {
			for (var srcreg = 0; srcreg < 8; srcreg++) {
				for (var firstreg = 0; firstreg < 8; firstreg++) {
					if (valid_source(srcmode, srcreg))
					{
						var opcode = 0xB000 + (firstreg << 9) + (size << 6) + (srcmode << 3) + srcreg;
						var iname = "CMP" + size_name(size) + " " + amode_name(srcmode, srcreg, size) + ",D" + firstreg
						var code = amode_read(srcmode, srcreg, size, true)
						var cost = (size == 2) ? 6 : 4;
						code += "var m=state.d" + firstreg + ";"
						if (size == 1) code += "m=m&0xFFFF;"
						if (size == 0) code += "m=m&0xFF;"
						if (size == 0) code += "cmpb(s,m);"
						if (size == 1) code += "cmpw(s,m);"
						if (size == 2) code += "cmpl(s,m);"
						insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(srcmode, srcreg, size))
					}
				}
			}
		}
	}
}

function build_adest()
{
	for (var areg = 0; areg < 8; areg++) {
		for (var srcreg = 0; srcreg < 8; srcreg++) {
			for (var srcmode = 0; srcmode < 8; srcmode++) {
				for (var size = 1; size < 3; size++) {
					if (valid_source(srcmode, srcreg))
					{
						var opcode = 0xB0C0 + (areg << 9) + ((size - 1) << 8) + (srcmode << 3) + srcreg
						var iname = "CMPA" + size_name(size) + " " + amode_name(srcmode, srcreg, size) + ",A" + areg
						var code = amode_read(srcmode, srcreg, size, true)
						var cost = 6 + effective_address_calculation_time(srcmode, srcreg, size);
						if (size == 1) code += "s=ewl(s);"
						code += "cmpl(s,state.a" + areg + ");"
						insert_inst2(opcode, code, iname, cost)

						cost += 2;
						if (size == 2 && srcmode != MODE_DREG && (srcmode != MODE_MISC || srcreg != MISCMODE_IMM)) {
							cost -= 2;
						}

						opcode = 0x90C0 + (areg << 9) + ((size - 1) << 8) + (srcmode << 3) + srcreg
						iname = "SUBA" + size_name(size) + " " + amode_name(srcmode, srcreg, size) + ",A" + areg
						code = amode_read(srcmode, srcreg, size, true)
						if (size == 1) code += "s=ewl(s);"
						code += "var r=state.a" + areg + " - s;"
						code += "if(r<0)r+=4294967296;"
						code += amode_write(1, areg, 2, "r")
						insert_inst2(opcode, code, iname, cost)

						opcode = 0xD0C0 + (areg << 9) + ((size - 1) << 8) + (srcmode << 3) + srcreg
						iname = "ADDA" + size_name(size) + " " + amode_name(srcmode, srcreg, size) + ",A" + areg
						code = amode_read(srcmode, srcreg, size, true)
						if (size == 1) code += "s=ewl(s);"; cost += 2;
						code += "var r=state.a" + areg + " + s;"
						code += "if(r>4294967295)r-=4294967296;"
						code += amode_write(1, areg, 2, "r")
						insert_inst2(opcode, code, iname, cost)
					}
				}
			}
		}
	}

}

function build_shifts(name, mask, altmask, namelower)
{
	// register target version
	for (var reg = 0; reg < 8; reg++) {
		for (var size = 0; size < 3; size++) {
			for (var shift = 0; shift < 8; shift++) {
				for (var mm = 0; mm < 2; mm++) {
					var actualshift = shift == 0 ? 8 : shift;
					var iname = "";
					var opcode = mask + 0x20 + (size << 6) + reg + (shift << 9);
					var shiftamount;
					var cost = (size == 2) ? 8 : 6;
					if (mm == 0)
					{
						opcode = opcode - 0x20;
						iname = name + size_name(size) + " #" + actualshift + ",D" + reg
						shiftamount = actualshift
					}
					else
					{
						iname = name + size_name(size) + " D" + shift + ",D" + reg
						shiftamount = "state.d" + shift + "&31";
					}
					var src = "";
					if (size == 0) src = "state.d" + reg + "&255"
					else if (size == 1) src = "state.d" + reg + "&65535"
					else if (size == 2) src = "state.d" + reg
					// TODO implement variable cost according to shiftamount.
					var code = amode_write(MODE_DREG, reg, size, namelower + "(" + src + "," + shiftamount + "," + size + ")")
					insert_inst2(opcode, code, iname, cost)
				}
			}
		}
	}

	// EA target version
	for (var reg = 0; reg < 8; reg++) {
		for (var mode = 0; mode < 8; mode++) {
			if (valid_dest(mode, reg) && mode != MODE_DREG && mode != MODE_AREG)
			{
				var opcode = altmask + (mode << 3) + reg;
				var iname = name + ".W " + amode_name(mode, reg, 1)
				var code = amode_read(mode, reg, 1, false)
				code += amode_write(mode, reg, 1, namelower + "(s,1,1)")
				insert_inst2(opcode, code, iname, 8 + effective_address_calculation_time(mode, reg, 1))
			}
		}
	}
}

function build_immediate(name, mask, operation)
{
	for (var reg = 0; reg < 8; reg++) {
		for (var mode = 0; mode < 8; mode++) {
			for (var size = 0; size < 3; size++) {
				if ((valid_dest(mode, reg) && mode != MODE_AREG) || (mode == MODE_MISC && reg == 4 && size < 2 && operation != ""))
				{
					var opcode = mask + (size << 6) + (mode << 3) + reg
					var mode_name = amode_name(mode, reg, size)
					if (mode == MODE_MISC && reg == 4 && size == 0) mode_name = "CCR"
					if (mode == MODE_MISC && reg == 4 && size == 1) mode_name = "SR"
					var iname = name + size_name(size) + size_imm(size) + mode_name
					var code = read_pc(size, "m", true)
					var cost = (mode == MODE_DREG) ? 8 : 12;
					if (size == 2) { 
						cost += 6;
						if (name != "ANDI" || mode != MODE_DREG) {
							cost += 2;
						}
					}
					if (mode == MODE_MISC && reg == 4)
					{
						if (size == 1) code += "if(state.sr&0x2000==0)fire_cpu_exception(8);";
						if (size == 0 && name == "ANDI") code += "m|=0xFF00;"
						code += "update_sr(state.sr" + operation.substring(7,8) + "m);"
						insert_inst2(opcode, code, iname, 20)
					}
					else
					{
						code += amode_read(mode, reg, size, false)
						if (operation != "")
						{
							code += operation;
							code += set_condition_flags_data(size, "r")
						}
						else
						{
							code += "var r=" + name.substring(0,3).toLowerCase() + size_name(size).substring(1,2).toLowerCase() + "(m,s);"
						}
						code += amode_write(mode, reg, size, "r")
						insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(mode, reg, size))
					}
				}
			}
		}
	}
}

function build_ext(name, bits)
{
	for (var src = 0; src < 8; src++) {
		for (var dst = 0; dst < 8; dst++) {
			for (var size = 0; size < 3; size++) {
				for (var mem = 0; mem < 2; mem++) {
					var opcode = bits + (dst << 9) + (size << 6) + (mem << 3) + src
					var iname = name + size_name(size)
					if (mem == 0)
						iname += " D" + src + ",D" + dst + "'"
					else
						iname += " -(A" + src + "),-(A" + dst + ")'"
					var mode = mem == 0 ? MODE_DREG : MODE_AREG_PREDEC
					var code = amode_read(mode, src, size, true)
					code += "var c=s;"
					code += amode_read(mode, dst, size, false)
					code += "var n=" + name.toLowerCase() + "(c,s," + size + ");"
					code += amode_write(mode, dst, size, "n")
					var cost = (mode == MODE_DREG) ? ((size == 2) ? 8 : 4) : ((size == 2) ? 30 : 18)
					insert_inst2(opcode, code, iname, cost)
				}
			}
		}
	}
}

function build_not_neg_clr_tst_tas()
{
	for (var size = 0; size < 3; size++) {
		for (var srcmode = 0; srcmode < 8; srcmode++) {
			for (var srcreg = 0; srcreg < 8; srcreg++) {
				if (valid_dest(srcmode, srcreg) && srcmode != MODE_AREG)
				{
					var opcode = 0x4600 + (size << 6) + (srcmode << 3) + srcreg;
					var iname = "NOT" + size_name(size) + " " + amode_name(srcmode, srcreg, size)
					var code = amode_read(srcmode, srcreg, size, false)
					var cost = (size == 2) ? 6 : 4;
					if (srcmode != MODE_DREG) {
						cost *= 2;
					}

					if (size == 0) code += "s=255-s;"
					if (size == 1) code += "s=65535-s;"
					if (size == 2) code += "s=4294967295-s;"
					code += set_condition_flags_data(size, "s")
					code += amode_write(srcmode, srcreg, size, "s")
					insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(srcmode, srcreg, size))

					// *** should fix overflow here sometime
					opcode = 0x4400 + (size << 6) + (srcmode << 3) + srcreg;
					iname = "NEG" + size_name(size) + " " + amode_name(srcmode, srcreg, size)
					code = amode_read(srcmode, srcreg, size, false)
					code += "state.sr &= 0xFFE0;"
					if (size == 0) code += "var r=s==0?0:256-s;if(r&0x80)state.sr|=8;"
					if (size == 1) code += "var r=s==0?0:65536-s;if(r&0x8000)state.sr|=8;"
					if (size == 2) code += "var r=s==0?0:4294967296-s;if(r&2147483647)state.sr|=8;"
					code += "if(r==0)state.sr|=4;else state.sr|=17;" // set zero flag for zero, extend and carry otherwise
					code += amode_write(srcmode, srcreg, size, "r")
					insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(srcmode, srcreg, size))

					opcode = 0x4000 + (size << 6) + (srcmode << 3) + srcreg;
					iname = "NEGX" + size_name(size) + " " + amode_name(srcmode, srcreg, size)
					code = amode_read(srcmode, srcreg, size, false)
					code += "state.sr &= 0xFFF0;"
					code += "if(state.sr&0x10)s++;"
					if (size == 0) code += "var r=256-s;"
					if (size == 1) code += "var r=65536-s;"
					if (size == 2) code += "var r=4294967296-s;if(r>4294967295)r=0;"
					code += set_condition_flags_data(size, "r")
					code += amode_write(srcmode, srcreg, size, "r")
					insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(srcmode, srcreg, size))

					opcode = 0x4200 + (size << 6) + (srcmode << 3) + srcreg;
					iname =  "CLR" + size_name(size) + " " + amode_name(srcmode, srcreg, size)
					code = amode_write(srcmode, srcreg, size, "0")
					code += "state.sr|=4;"
					insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(srcmode, srcreg, size))

					opcode = 0x4a00 + (size << 6) + (srcmode << 3) + srcreg;
					iname = "TST" + size_name(size) + " " + amode_name(srcmode, srcreg, size)
					code = amode_read(srcmode, srcreg, size, true)
					code += set_condition_flags_data(size, "s")
					insert_inst2(opcode, code, iname, 4 + effective_address_calculation_time(srcmode, srcreg, size))

					// TAS exists only under byte form.
					if (size == 0)
					{
						opcode = 0x4ac0 + (srcmode << 3) + srcreg;
						iname = "TAS.B" + " " + amode_name(srcmode, srcreg, 0)
						code = amode_read(srcmode, srcreg, 0, true)
						code += set_condition_flags_data(0, "s")
						code += amode_write(srcmode, srcreg, 0, "s | 0x80")
						insert_inst2(opcode, code, iname, (srcmode == MODE_DREG) ? 4 : (14 + effective_address_calculation_time(srcmode, srcreg, size)))
					}
				}
			}
		}
	}
}

function build_lea()
{
	for (var srcmode = 0; srcmode < 8; srcmode++) {
		for (var srcreg = 0; srcreg < 8; srcreg++) {
			for (var reg = 0; reg < 8; reg++) {
				if (valid_calc_effective_address(srcmode, srcreg))
				{
					var opcode = 0x41C0 + (reg << 9) + (srcmode << 3) + srcreg;
					var iname = "LEA " + amode_name(srcmode, srcreg, 1) + ",A" + reg
					var code = effective_address_calc(srcmode, srcreg)
					code += "state.a" + reg + "=z;"
					if (opcode == 0x41FA && enable_kludge_in_lea_d_pc_a0) {
						code += "if((o == 7) && (state.pc < 0x40000) && (rw(state.pc) == 0x4210) && (rw(state.pc+2) == 0x6000) && (rw(state.pc+4) == 0x000A) && (rw(state.pc+6) == 0x0000) && (rw(state.pc+8) == 0x4E4C) && (rw(state.pc+10) == 0x534F) && (rw(state.pc+12) == 0x4AFC)) { state.pc += 14; }";
					}
					insert_inst(opcode, code, iname)
				}
			}
		}
	}
}

function build_cmpi()
{
	for (var size = 0; size < 3; size++) {
		for (var srcmode = 0; srcmode < 8; srcmode++) {
			for (var srcreg = 0; srcreg < 8; srcreg++) {
				if (valid_dest(srcmode, srcreg))
				{
					var opcode = 0xC00 + (size << 6) + (srcmode << 3) + srcreg;
					var iname = "CMPI" + size_name(size) + size_imm(size) + amode_name(srcmode, srcreg, size)
					var code = read_pc(size, "subtrahend",true)
					var cost = 8;
					if (size == 2) {
						cost += 4;
						if (srcmode == MODE_DREG) {
							cost += 2;
						}
					}
					code += amode_read(srcmode, srcreg, size, true)
					if (size==0) code += "cmpb(subtrahend, s);"
					if (size==1) code += "cmpw(subtrahend, s);"
					if (size==2) code += "cmpl(subtrahend, s);"
					insert_inst2(opcode, code, iname, cost + effective_address_calculation_time(srcmode, srcreg, size))
				}
			}
		}
	}
}

function build_movem()
{
	for (var reg = 0; reg < 8; reg++) {
		for (var mode = 0; mode < 8; mode++) {
			for (var size = 1; size < 3; size++) {
				var actualsize = size * 2
				// to registers
				if (mode == MODE_AREG_INDIRECT || 
					mode == MODE_AREG_POSTINC ||
					mode == MODE_AREG_OFFSET || 
					mode == MODE_AREG_INDEX || 
					(mode == MODE_MISC &&
						(reg == MISCMODE_SHORT ||
						 reg == MISCMODE_LONG ||
						 reg == MISCMODE_PC_OFFSET ||
						 reg == MISCMODE_PC_INDEX)))
				{
					var opcode = 0x4c80 + ((size - 1) << 6) + (mode << 3) + reg
					var iname = "MOVEM" + size_name(size + 1) + " " + amode_name(mode, reg, size) + ",regs"
					var code = read_pc(1, "regs", true)
					if (mode == MODE_AREG_POSTINC)
						code += "var newval = load_multiple_postinc(state.a" + reg + ", regs, " + size + "); state.a" + reg + " = newval;";
					else
					{
						code += effective_address_calc(mode, reg);
						code += "load_multiple(z,regs," + size + ");"
					}
					insert_inst(opcode, code, iname)
				}

				// from registers
				if (mode == MODE_AREG_INDIRECT || 
					mode == MODE_AREG_PREDEC ||
					mode == MODE_AREG_OFFSET || 
					mode == MODE_AREG_INDEX || 
					(mode == MODE_MISC &&
						(reg == MISCMODE_SHORT ||
						 reg == MISCMODE_LONG)))
				{
					var opcode = 0x4880 + ((size - 1) << 6) + (mode << 3) + reg
					var iname = "MOVEM" + size_name(size) + " regs," + amode_name(mode, reg, size)
					var code = read_pc(1, "regs", true)
					if (mode == MODE_AREG_PREDEC)
					{
						iname = iname.replace("regs", "regspredec");
						code += "var newval = store_multiple_predec(state.a" + reg + ", regs, " + size + "); state.a" + reg + " = newval;";
					}
					else
					{
						code += effective_address_calc(mode, reg)
						code += "store_multiple(z, regs, " + size + ");"
					}
					insert_inst(opcode, code, iname)
				}
			}
		}
	}
}

function build_cmpm()
{
	for (var src = 0; src < 8; src++) {
		for (var dest = 0; dest < 8; dest++) {
			for (var size = 0; size < 3; size++) {
				var opcode = 0xB108 + (dest << 9) + (size << 6) + src
				var iname = "CMPM" + size_name(size) + " (A" + src + ")+,(A" + dest + ")+'"
				var code = amode_read(MODE_AREG_POSTINC, src, size, true)
				code += "var u=s;"
				code += amode_read(MODE_AREG_POSTINC, dest, size, true)
				if (size == 0) code += "cmpb(u,s);"
				if (size == 1) code += "cmpw(u,s);"
				if (size == 2) code += "cmpl(u,s);"
				insert_inst2(opcode, code, iname, (size == 2) ? 20 : 12)
			}
		}
	}
}

function build_bcd()
{
	// ABCD, SBCD
	for (var src = 0; src < 8; src++) {
		for (var dest = 0; dest < 8; dest++) {
			for (var m = 1; m >= 0; m--) {
				for (var sub = 0; sub <= 1; sub++) {
					var operation = sub == 0 ? "ABCD" : "SBCD"
					var opcode = 0x8100 + (dest << 9) + src
					if (operation == "ABCD") opcode += 0x4000
					var iname = ""
					var cost = 0;
					if (m != 0)
					{
						opcode += 8
						iname = operation + " -(A" + src + "),-(A" + dest + ")"
						cost = 18;
					}
					else
					{
						iname = operation + " D" + src + ",D" + dest
						cost = 6;
					}
					var code = ""
					if (m != 0)
					{
						code = amode_read(MODE_AREG_PREDEC, src, 0, true)
						code += "var other = s;"
						code += amode_read(MODE_AREG_PREDEC, dest, 0, true)
						code += amode_write(MODE_AREG_INDIRECT, dest, 0, operation.toLowerCase() + "(s,other)")
					}
					else
					{
						code = "state.d" + dest + "+=" + operation.toLowerCase() + "(state.d" + dest + ",state.d" + src + ")-state.d" + dest + "&0xFF;"
					}
					insert_inst2(opcode, code, iname, cost)
				}
			}
		}
	}

	// NBCD, more similar to NEG and NOT (more different EAs are allowed).
	for (var srcmode = 0; srcmode < 8; srcmode++) {
		for (var srcreg = 0; srcreg < 8; srcreg++) {
			if (valid_dest(srcmode, srcreg) && srcmode != MODE_AREG)
			{
				opcode = 0x4800 + (srcmode << 3) + srcreg;
				iname = "NBCD " + amode_name(srcmode, srcreg, 0)
				code = amode_read(srcmode, srcreg, 0, false)
				code += "var r=nbcd(s);"
				code += amode_write(srcmode, srcreg, 0, "r")
				insert_inst2(opcode, code, iname, (srcmode == MODE_DREG) ? 6 : (8 + effective_address_calculation_time(srcmode, srcreg, 0)))
			}
		}
	}

}

function build_movesrccr()
{
	for (var srcmode = 0; srcmode < 8; srcmode++) {
		for (var srcreg = 0; srcreg < 8; srcreg++) {
			if (valid_source(srcmode, srcreg) && srcmode != MODE_AREG)
			{
				var opcode = 0x46C0 + (srcmode << 3) + srcreg;
				var iname = "MOVE " + amode_name(srcmode, srcreg, 1) + ",SR"
				var cost = 12 + effective_address_calculation_time(srcmode, srcreg, 0);
				insert_inst2(opcode, "if(state.sr&0x2000==0)fire_cpu_exception(8);" + amode_read(srcmode, srcreg, 1, true) + "update_sr(s);", iname, cost)

				opcode = 0x44C0 + (srcmode << 3) + srcreg;
				iname = "MOVE " + amode_name(srcmode, srcreg, 0) + ",CCR"
				insert_inst2(opcode, amode_read(srcmode, srcreg, 0, true) + "state.sr = (state.sr&0xFF00) + s;", iname, cost)
			}
			if (valid_dest(srcmode, srcreg) && srcmode != MODE_AREG)
			{
				var opcode = 0x40C0 + (srcmode << 3) + srcreg;
				var iname = "MOVE SR," + amode_name(srcmode, srcreg, 1)
				var cost = (srcmode == MODE_DREG) ? 6 : 8;
				// MOVE from SR is not privileged on the 68000.
				insert_inst2(opcode, amode_write(srcmode, srcreg, 1, "state.sr"), iname, cost + effective_address_calculation_time(srcmode, srcreg, 1))
			}
		}
	}
}

function build_exchange(xtype, ytype, bits)
{
	for (var x = 0; x < 8; x++) {
		for (var y = 0; y < 8; y++) {
			var opcode = bits + (x << 9) + y
			var iname = "EXG " + xtype + x + "," + ytype + y
			var xstr = "state." + xtype.toLowerCase() + x
			var ystr = "state." + ytype.toLowerCase() + y
			var code = "var e=" + xstr + ";"
			code += xstr + "=" + ystr + ";"
			code += ystr + "=e;"
			insert_inst2(opcode, code, iname, 6)
		}
	}
}

function build_jmpjsr()
{
	for (var mode = 0; mode < 8; mode++) {
		for (var reg = 0; reg < 8; reg++) {
			if (valid_calc_effective_address(mode, reg)) {
				for (var jsr = 1; jsr >= 0; jsr--) {
					var opcode = 0x4EC0 + (mode << 3) + reg - jsr * 0x40;
					var iname = (jsr == 1 ? "JSR " : "JMP ") + amode_name(mode, reg, 0)
					var code = effective_address_calc(mode, reg)
					if (jsr == 1)
						code += amode_write(4, 7, 2, "state.pc")
					code += "state.pc=z;"
					insert_inst(opcode, code, iname)
				}
			}
		}
	}
}

function build_pea()
{
	for (var srcmode = 0; srcmode < 8; srcmode++) {
		for (var srcreg = 0; srcreg < 8; srcreg++) {
			if (valid_calc_effective_address(srcmode, srcreg))
			{
				var opcode = 0x4840 + (srcmode << 3) + srcreg;
				var iname = "PEA " + amode_name(srcmode, srcreg, 0)
				insert_inst(opcode, effective_address_calc(srcmode, srcreg) + amode_write(4, 7, 2, "z"), iname)
			}
		}
	}
}

function build_swap()
{
	for (var reg = 0; reg < 8; reg++) {
		var code = "var l = state.d" + reg + "&65535;"
		code += "var h = state.d" + reg + " >>> 16;"
		code += "state.d" + reg + " = (l * 65536) + h;"
		insert_inst2(0x4840 + reg, code, "SWAP D" + reg, 4)
	}
}

function build_chk()
{
	for (var srcmode = 0; srcmode < 8; srcmode++) {
		for (var srcreg = 0; srcreg < 8; srcreg++) {
			for (var reg = 0; reg < 8; reg++) {
				if (valid_dest(srcmode, srcreg) && srcmode != MODE_AREG)
				{
					var opcode = 0x4180 + (reg << 9) + (srcmode << 3) + srcreg;
					var iname = "CHK.W " + amode_name(srcmode, srcreg, 1) + ",D" + reg
					var code = amode_read(srcmode, srcreg, 1, true)
					code += "if (state.d" + reg + "<0) { state.sr |= 8; fire_cpu_exception(6); } if(state.d" + reg + "> s) { state.sr &= 0xFFF7; fire_cpu_exception(6); }"
					insert_inst(opcode, code, iname)
				}
			}
		}
	}
}

// fill default instruction table, initially all unhandled instructions, except A-Line and F-Line.
function build_initial_instructions_handlers()
{
	var i;
	for (i = 0; i < 0xA000; i++) {
		cpu.t[i] = unhandled_instruction;
		cpu.n[i] = 'UNKNOWN';
		cpu.cycles[i] = 0; // Should be 34
	}

	for (i = 0xA000; i <= 0xAFFF; i++) {
		cpu.t[i] = aline;
		cpu.n[i] = "ALINE " + to_hex(i,3);
		cpu.cycles[i] = 34;
	}

	for (i = 0xB000; i < 0xF000; i++) {
		cpu.t[i] = unhandled_instruction;
		cpu.n[i] = 'UNKNOWN';
		cpu.cycles[i] = 0; // Should be 34
	}

	for (i = 0xF000; i <= 0xFFFF; i++) {
		cpu.t[i] = fline;
		cpu.n[i] = "FLINE " + to_hex(i,3);
		cpu.cycles[i] = 34;
	}
}

function build_all_instructions()
{
	build_initial_instructions_handlers();

	build_moveq();
	build_addsubq();
	// bit patterns specifying size are different for MOVE than most other instructions, and Sybex book has them wrong!
	build_moves("MOVE.L", 2, 0x2000);
	build_moves("MOVE.W", 1, 0x3000);
	build_moves("MOVE.B", 0, 0x1000);
	build_movep(); // TODO: proper implementation, instead of a 4-byte NOP
	build_conditionals("if(true)", "T", 0)
	build_conditionals("if(false)", "F", 1)
	build_conditionals("if(!(state.sr&5))", "HI", 2)
	build_conditionals("if(state.sr&5)", "LS", 3)
	build_conditionals("if(!(state.sr&1))", "CC", 4)
	build_conditionals("if(state.sr&1)", "CS", 5)
	build_conditionals("if(!(state.sr&4))", "NE", 6)
	build_conditionals("if(state.sr&4)", "EQ", 7)
	build_conditionals("if(!(state.sr&2))", "VC", 8)
	build_conditionals("if(state.sr&2)", "VS", 9)
	build_conditionals("if(!(state.sr&8))", "PL", 10)
	build_conditionals("if(state.sr&8)", "MI", 11)
	build_conditionals("if(((state.sr&10)==0)||((state.sr&10)==10))", "GE", 12)
	build_conditionals("if(((state.sr&10)==8)||((state.sr&10)==2))", "LT", 13)
	build_conditionals("if((((state.sr&10)==0)||((state.sr&10)==10))&(!(state.sr&4)))", "GT", 14)
	build_conditionals("if((state.sr&4)||((state.sr&10)==8)||((state.sr&10)==2))", "LE", 15)
	build_calc("EOR", 0xB000)
	build_calc("ADD", 0xD000)
	build_calc("AND", 0xC000)
	build_calc("SUB", 0x9000)
	build_calc("OR", 0x8000)
	build_muldiv("DIVS", 0x81C0, "divs", 158)
	build_muldiv("DIVU", 0x80C0, "divu", 140)
	build_muldiv("MULS", 0xC1C0, "muls", 70)
	build_muldiv("MULU", 0xC0C0, "mulu", 70)
	build_bit_operation("BCHG", 0x840, 8, 8)
	build_bit_operation("BCLR", 0x880, 10, 8)
	build_bit_operation("BSET", 0x8C0, 8, 8)
	build_bit_operation("BTST", 0x800, 6, 4)
	build_shifts("ASL", 0xE100, 0xE1C0, "asl")
	build_shifts("ASR", 0xE000, 0xE0C0, "asr")
	build_shifts("LSL", 0xE108, 0xE3C0, "lsl")
	build_shifts("LSR", 0xE008, 0xE2C0, "lsr")
	build_shifts("ROXL", 0xE110, 0xE5C0, "roxl")
	build_shifts("ROXR", 0xE010, 0xE4C0, "roxr")
	build_shifts("ROL", 0xE118, 0xE7C0, "rol")
	build_shifts("ROR", 0xE018, 0xE6C0, "ror")
	build_cmp()
	build_adest()
	build_immediate("ORI", 0, "var r=s|m;")
	build_immediate("ANDI", 0x200, "var r=s&m;")
	build_immediate("EORI", 0xA00, "var r=s^m;")
	build_immediate("ADDI", 0x600, "")
	build_immediate("SUBI", 0x400, "")
	build_ext("ADDX", 0xD100)
	build_ext("SUBX", 0x9100)
	build_not_neg_clr_tst_tas()
	build_lea()
	build_cmpi()
	build_movem()
	build_cmpm()
	build_bcd()
	build_exchange("D", "D", 0xC140)
	build_exchange("A", "A", 0xC148)
	build_exchange("D", "A", 0xC188)
	insert_inst2(0x4E70, "if(state.sr&0x2000==0)fire_cpu_exception(8);initialize_calculator()", "RESET", 132)
	insert_inst2(0x4E71, "", "NOP", 4)
	insert_inst2(0x4E72, "if(state.sr&0x2000==0)fire_cpu_exception(8);state.pc+=2", "STOP #xxx", 4) // TODO: proper implementation, instead of a 4-byte NOP
	insert_inst2(0x4E73, "if(state.sr&0x2000==0)fire_cpu_exception(8);var s=rw(state.a7);state.a7+=2;state.pc=rl(state.a7);state.a7+=4;update_sr(s)", "RTE", 20)
	insert_inst2(0x4E75, "state.pc=rl(state.a7);state.a7+=4;", "RTS", 16)
	insert_inst2(0x4E76, "if(state.sr&2)fire_cpu_exception(7)", "TRAPV", 4) // TRAPV
	insert_inst2(0x4E77, "var s=rw(state.a7);state.a7+=2;state.pc=rl(state.a7);state.a7+=4;state.sr=(state.sr&0xFFE0)|(s&0x001F)", "RTR", 20)
	insert_inst2(0x4AFC, "print_status(); disassemble(state.pc-32, 20); fire_cpu_exception(4)", "ILLEGAL", 34) // Illegal instruction
	build_movesrccr()
	build_jmpjsr()
	build_pea()
	build_swap()
	build_chk()
	for (var vector = 0; vector < 16; vector++) {
		insert_inst2(0x4E40 + vector, "fire_cpu_exception(" + (32 + vector) + ")", "TRAP #" + vector, 34) // TRAP #
	}
	for (var reg = 0; reg < 8; reg++) {
		insert_inst2(0x4E60 + reg, "if(state.sr&0x2000==0)fire_cpu_exception(8);state.a8=state.a" + reg, "MOVE A" + reg + ",USP", 4) // Privilege violation
		insert_inst2(0x4E68 + reg, "if(state.sr&0x2000==0)fire_cpu_exception(8);state.a" + reg +"=state.a8", "MOVE USP,A" + reg, 4) // Privilege violation
		insert_inst2(0x4880 + reg, "state.d" + reg + "=((state.d" + reg + ">>>16)*65536)+ebw(state.d" + reg + ")", "EXT.W D" + reg, 4)
		insert_inst2(0x48C0 + reg, "state.d" + reg + "=ewl(state.d" + reg + ")", "EXT.L D" + reg, 4)
		var linkcode = "state.a7-=4; wl(state.a7,state.a" + reg + "); var o=rw(state.pc); state.pc+=2; state.a" + reg + "=state.a7; state.a7+=(o<0x8000?o:o-0x10000);"
		insert_inst2(0x4e50 + reg, linkcode, "LINK A" + reg + ",#xxx", 16)
		var unlkcode ="state.a7 = state.a" + reg + "; var s=rl(state.a7); state.a7+=4; state.a" + reg + " = s;"
		insert_inst2(0x4e58 + reg, unlkcode, "UNLK A" + reg, 12)
	}
	eval(instruction_list);

	var unknown = 0;
	var nocost = 0;
	for (var i = 0; i < 65536; i++) {
		if (cpu.n[i] == "UNKNOWN") {
			unknown++;
			cpu.n[i] = "DC.W " + state.hex_prefix + to_hex(i, 4);
		}
		if (cpu.cycles[i] == 0) {
			nocost++;
		}
	}
	

}

build_all_instructions();

function read_hreg(reg)
{
	switch (reg)
	{
		case 0x600000: // 0x600000
		{
			return 0x04;
		}

		case 0x600001: // 0x600001
		{
			return state.vectorprotect ? 4 : 0;
		}

		case 0x60000c: // 0x60000c
		{
			//stdlib.console.log("read link configuation: " + to_hex(link_config, 2));
			return link.get_link_config();
		}

		case 0x60000d: // 0x60000d
		{
			return link.compute_link_status();
		}

		case 0x60000e: // 0x60000e
		{
			return 0x10;
		}

		case 0x60000f: // 0x60000f
		{
			return link.read_byte();
		}

		case 0x600015: // 0x600015
		{
			return state.interrupt_control; // default value for interrupt / display control
		}

		case 0x600017: // 0x600017
		{
			return state.timer_current; // programmable timer
		}

		case 0x600018: // 0x600018
		{
			return state.keymaskhigh; // which keys are readable
		}

		case 0x600019: // 0x600019
		{
			return state.keymasklow; // which keys are readable
		}

		case 0x60001a: // 0x60001a
		{
			return state.port_60001A; // ON key read
		}

		case 0x60001b: // 0x60001b
		{
			// keyboard read - treat as no keys pressed
			// In TIEmu, see src/core/ti_hw/kbd.c::hw_kbd_read_cols().
			var result = 0xFF;
			var keymask = state.keymaskhigh * 256 + state.keymasklow;
			for (var row = 0; row <= 9; row++) {
				if ((keymask & (1 << row)) == 0) {
					for (var col = 0; col < 8; col++) {
						if (state.keystatus[row * 8 + col] == 1) {
							result &= (0xFF - (1 << col));
						}
					}
				}
			}
			state.port_60001B = result;
			return result;
		}

		case 0x60001d: // 0x60001d: contrast setting
		{
			return state.port_60001D;
		}

		case 0x700017: // 0x700017: HW2 snoop palette range.
		{
			return state.port_700017;
		}

		case 0x70001d: // 0x70001d
		{
			return state.port_70001D;
		}
		
		case 0x70001f: // 0x70001f
		{
			return state.port_70001F;
		}

		default:
		{
			//stdlib.console.log("pc " + to_hex(pc, 6) + ": read from " + to_hex(reg, 6));
			return (reg & 1) ? 0 : 0x14;
		}
	}
}

// write a hardware register (byte)
function write_hreg(reg, value)
{
	switch (reg)
	{
		case 0x600000: // 0x600000
		{
			//port_600000 = value;
			break;
		}

		case 0x600001: // 0x600001
		{
			state.vectorprotect = ((value & 4) == 4);
			break;
		}

		case 0x600002: // 0x600002: wait states, not needed on 89 hardware according to J89hw.txt.
		case 0x600003: // 0x600003
		{
			// Ignore.
			break;
		}

		case 0x600005: // 0x600005
		{
			//state.wakemask = value;
			//throw "STOP";
			//state.stopped = true;
			break;
		}

		case 0x60000c: // 0x60000c
		{
			link.set_link_config(value);
			break;
		}

		case 0x60000f: // 0x60000f
		{
			link.write_byte(value);
			break;
		}

		case 0x600010: // 0x600010
		{
			state.lcd_address_high = value;
			break;
		}

		case 0x600011: // 0x600011
		{
			state.lcd_address_low = value;
			//stdlib.console.log(to_hex((lcd_address_high * 256 + lcd_address_low) * 8, 6));
			break;
		}

		case 0x600012: // 0x600012: logical LCD width.
		{
			state.screen_width = (64 - (value & 63)) * 16;
			break;
		}

		case 0x600013: // 0x600013
		{
			state.screen_height = 256 - value;
			break;
		}

		case 0x600014: // 0x600014: nothing, but some writes to port 600015 are word writes.
		{
			// Ignore.
			break;
		}

		case 0x600015: // 0x600015
		{
			state.interrupt_control = value;
			switch ((state.interrupt_control >> 4) & 0x3)
			{
				case 0:
					state.interrupt_rate = 0x20;
					break;
				case 1:
					state.interrupt_rate = 0x200;
					break;
				case 2:
					state.interrupt_rate = 0x1000;
					break;
				case 3:
					state.interrupt_rate = 0x40000;
					break;
			}
			//stdlib.console.log("writing interrupt_control: " + to_hex(interrupt_control, 2) + " at " + to_hex(state.prev_pc, 6));
			break;
		}

		case 0x600016: // 0x600016: nothing, but some writes to port 600016 are word writes.
		{
			// Ignore.
			break;
		}

		case 0x600017: // 0x600017: programmable timer
		{
			state.timer_current = value; state.timer_min = value;
			break;
		}

		case 0x600018: // 0x600018
		{
			state.keymaskhigh = value;
			break;
		}

		case 0x600019: // 0x600019
		{
			state.keymasklow = value;
			break;
		}

		case 0x60001a: // 0x60001a: acknowledge AUTO_INT_6
		{
			state.port_60001A = value;
			break;
		}

		case 0x60001b: // 0x60001b: acknowledge AUTO_INT_2
		{
			// TODO: implement this.
			state.port_60001B = value; // Tentative implementation ?
			break;
		}

		case 0x60001c: // 0x60001C: LCD row sync frequency
		{
			//state.port_60001C = value;
			//stdlib.console.log("Setting 60001C to " + to_hex(value, 2));
			//ui.set_screen_enabled_and_contrast(state.calculator_model, state.hardware_model, state.port_60001C, state.port_60001D, state.port_70001D, state.port_70001F);
			break;
		}

		case 0x60001d: // 0x60001d
		{
			//state.port_60001D = value;
			//stdlib.console.log("Setting 60001D to " + to_hex(value, 2));
			//ui.set_screen_enabled_and_contrast(state.calculator_model, state.hardware_model, state.port_60001C, state.port_60001D, state.port_70001D, state.port_70001F);
			break;
		}

		case 0x700000: // 0x700000: RAM execution protection.
		case 0x700001: // 0x700001
		case 0x700002: // 0x700002
		case 0x700003: // 0x700003
		case 0x700004: // 0x700004
		case 0x700005: // 0x700005
		case 0x700006: // 0x700006
		case 0x700007: // 0x700007
		case 0x700008: // 0x700008: RAM execution protection (ghosts)
		case 0x700009: // 0x700009
		case 0x70000a: // 0x70000a
		case 0x70000b: // 0x70000b
		case 0x70000c: // 0x70000c
		case 0x70000d: // 0x70000d
		case 0x70000e: // 0x70000e
		case 0x70000f: // 0x70000f
		{
			// Ignore. This protection is nothing more than an impediment, and emulating it would slow the emulator down.
			break;
		}

		case 0x700010: // 0x700010: link port transfer speed.
		case 0x700011: // 0x700011
		{
			// Ignore, we're not emulating link port that way.
			break;
		}

		case 0x700012: // 0x700012: Flash ROM execution protection.
		case 0x700013: // 0x700013
		{
			// Ignore. This protection is nothing more than an impediment, and emulating it would slow the emulator down.
			break;
		}

		case 0x700017: // 0x700017: LCD snoop palette range
		{
			state.port_700017 = value & 0x03;
			state.lcd_address = 0x4c00 + (state.port_700017 * 0x1000);
			//stdlib.console.log("Setting LCD address to " + to_hex(lcd_address, 4));
			break;
		}

		case 0x70001c: // 0x70001c
		{
			// Ignore: the battery checker code does word writes, but there's nothing at 70001C, AFAWCT.
			break;
		}

		case 0x70001d: // 0x70001d
		{
			//state.port_70001D = value;
			//stdlib.console.log("Setting 70001D to " + to_hex(value, 2));
			//ui.set_screen_enabled_and_contrast(state.calculator_model, state.hardware_model, state.port_60001C, state.port_60001D, state.port_70001D, state.port_70001F);
			break;
		}

		case 0x70001f: // 0x70001f
		{
			//state.port_70001F = value;
			//stdlib.console.log("Setting 70001F to " + to_hex(value, 2));
			//ui.set_screen_enabled_and_contrast(state.calculator_model, state.hardware_model, state.port_60001C, state.port_60001D, state.port_70001D, state.port_70001F);
			break;
		}

		default:
		{
			//stdlib.console.log("pc " + to_hex(pc, 6) + ": write " + to_hex(value, 2) + " to " + to_hex(reg, 6));
			break;
		}
	}
}


function build_memory_read_functions(suffix, flashmemoryaddress, flashmemorysize)
{
// Tried again 20140301: while Firefox copes with the 4096-case switch with minor, if measurable (10-20%) slowdown, Chrome still doesn't.
/*
	var memory_read_function =
"rw_" + suffix + "_normal = function rw_" + suffix + "_normal(address)" +
"{" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 1; fire_cpu_exception(3); }" + // Address Error
"	switch (((address & 0x00FFF000) >>> 12) & 0xFFF) {";
	for (var i = 0; i < 8; i++) {
		for (var j = 0; j < 0x40; j++) { // RAM and ghosts (HW1, HW2 - ignore HW3 & HW4 ghosts at 200000 & 400000, nobody uses that)
			memory_read_function += "case " + ((i * 0x40) + j) + ":";
		}
		if (i == 0) {
			memory_read_function += "return ram[address >>> 1];";
		}
		else {
			memory_read_function += "address -= " + (i * 0x40000) + "; return ram[address >>> 1];";
		}
	}
	for (var j = flashmemoryaddress >>> 12; j < (flashmemoryaddress + flashmemorysize) >>> 12; j++) {
		memory_read_function += "case " + j + ":";
	}
	memory_read_function += "address -= " + flashmemoryaddress + "; return state.rom[address >>> 1];";
	memory_read_function += "case 0x600: return read_hreg(address) * 256 + read_hreg(address + 1);";
	memory_read_function += "case 0x700: return read_hreg(address) * 256 + read_hreg(address + 1);";
	memory_read_function += "case 0x710: return read_hreg(address) * 256 + read_hreg(address + 1);";
	memory_read_function += "default: return 0x1400;" +
	"}" +
"}";
	eval(memory_read_function);
*/

	var memory_read_function =
"rw_" + suffix + "_normal = function rw_" + suffix + "_normal(address)" +
"{" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 1; fire_cpu_exception(3); }" + // Address Error
"	address = address & 0xFFFFFE;" +
"	if (address < " + ((suffix != "9") ? "0x200000" : "0x40000") + ") {" + // RAM and ghosts < 0x200000
"		return state.ram[(address & 0x3FFFE) >>> 1];" +
"	}" +
"	else if (address >= " + flashmemoryaddress + " && address < " + (flashmemoryaddress + flashmemorysize) + ") {" +
"		return state.rom[(address - " + flashmemoryaddress + ") >>> 1];" +
"	}" +
"	else if (address >= 0x600000 && address < 0x800000) {" +
"		return read_hreg(address) * 256 + read_hreg(address + 1);" +
"	}" +
"	else" +
"		return 0x1400;" +
"}";
	eval(memory_read_function);

	memory_read_function =
"rb_" + suffix + "_normal = function rb_" + suffix + "_normal(address)" +
"{" +
"	address = address & 0xFFFFFF;" +
"	if (address < " + ((suffix != "9") ? "0x200000" : "0x40000") + ") {" + // RAM and ghosts < 0x200000
"		address &= 0x3FFFF;" +
"		if ((address & 1) == 0) {" +
"			return state.ram[address >>> 1] >>> 8;" +
"		}" +
"		else {" +
"			return state.ram[address >>> 1] & 0xFF;" +
"		}" +
"	}" +
"	else if (address >= " + flashmemoryaddress + " && address < " + (flashmemoryaddress + flashmemorysize) + ") {" +
"		if ((address & 1) == 0) {" +
"			return state.rom[(address - " + flashmemoryaddress + ") >>> 1] >>> 8;" +
"		}" +
"		else {" +
"			return state.rom[(address - " + flashmemoryaddress + "- 1) >>> 1] & 0xFF;" +
"		}" +
"	}" +
"	else if (address >= 0x600000 && address < 0x800000) {" +
"		return read_hreg(address);" +
"	}" +
"	else" +
"		return (address & 1) ? 0 : 0x14;" +
"}";
	eval(memory_read_function);

	memory_read_function =
"rw_" + suffix + "_flashspecial = function rw_" + suffix + "_flashspecial(address)" +
"{" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 1; fire_cpu_exception(3); };" + // Address Error
"	address = address & 0xFFFFFE;" +
"	if (address < " + ((suffix != "9") ? "0x200000" : "0x40000") + ") {" + // RAM and ghosts < 0x200000
"		return state.ram[(address & 0x3FFFE) >>> 1];" +
"	}" +
"	else if (address >= " + flashmemoryaddress + " && address < " + (flashmemoryaddress + flashmemorysize) + ") {" +
"		if (state.flash_write_phase == 0x90) {" + // Read identifier codes mode
"			switch (address & 0xffff) {" +
"				case 0:  return " + ((suffix == 8 || suffix == 9) ? "0x00b0" : "0x0089") + ";" + // manufacturer code
"				case 2:  return " + ((suffix == 9 && state.large_flash_memory) ? "0x00b0" : "0x00b5") + ";" + // device code
"				default: return 0xffff;" +
"			}" +
"		}" +
"		else {" +
"			return state.rom[(address - " + flashmemoryaddress + ") >>> 1] | state.flash_ret_or;" +
"		}" +
"	}" +
"	else if (address >= 0x600000 && address < 0x800000) {" +
"		return read_hreg(address) * 256 + read_hreg(address + 1);" +
"	}" +
"}";
	eval(memory_read_function);

	memory_read_function =
"rb_" + suffix + "_flashspecial = function rb_" + suffix + "_flashspecial(address)" +
"{" +
"	address = address & 0xFFFFFF;" +
"	if (address < " + ((suffix != "9") ? "0x200000" : "0x40000") + ") {" + // RAM and ghosts < 0x200000
"		address &= 0x3FFFF;" +
"		if ((address & 1) == 0) {" +
"			return state.ram[address >>> 1] >>> 8;" +
"		}" +
"		else {" +
"			return state.ram[address >>> 1] & 0xFF;" +
"		}" +
"	}" +
"	else if (address >= " + flashmemoryaddress + " && address < " + (flashmemoryaddress + flashmemorysize) + ") {" +
"		if (state.flash_write_phase == 0x90) {" + // Read identifier codes mode; not sure anyone uses it under byte form...
"			switch (address & 0xffff) {" +
"				case 0:  return 0x00;" +
"				case 1:  return " + ((suffix == 8 || suffix == 9) ? "0xb0" : "0x89") + ";" + // manufacturer code
"				case 2:  return 0x00;" +
"				case 3:  return " + ((suffix == 9 && state.large_flash_memory) ? "0xb0" : "0xb5") + ";" + // device code
"				default: return 0xff;" +
"			}" +
"		}" +
"		else {" +
"			if ((address & 1) == 0) {" +
"				return ((state.rom[(address - " + flashmemoryaddress + ") >>> 1] >>> 8) | state.flash_ret_or) & 0xFF;" +
"			}" +
"			else {" +
"				return (state.rom[(address - " + flashmemoryaddress + "- 1) >>> 1] | state.flash_ret_or) & 0xFF;" +
"			}" +
"		}" +
"	}" +
"	else if (address >= 0x600000 && address < 0x800000) {" +
"		return read_hreg(address);" +
"	}" +
"}";
	eval(memory_read_function);
}

build_memory_read_functions("1", 0x400000, 0x200000); // 92+
build_memory_read_functions("3", 0x200000, 0x200000); // 89
build_memory_read_functions("8", 0x200000, 0x400000); // V200
build_memory_read_functions("9", 0x800000, (state.large_flash_memory ? 0x800000 : 0x400000)); // 89T

function rl(address)
{
	var high_word = rw(address);
	var low_word = rw(address + 2);
	return ((high_word * 65536 + low_word));
}


function build_memory_write_functions(suffix, flashmemoryaddress, flashmemorysize)
{
	var memory_write_function =
"ww_" + suffix + "_normal = function ww_" + suffix + "_normal(address, value)" +
"{" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 0; fire_cpu_exception(3); };" + // Address Error
"	address = address & 0xFFFFFE;" +
"	if (address < " + ((suffix != "9") ? "0x200000" : "0x40000") + ") {" + // RAM and ghosts < 0x200000
"		state.ram[(address & 0x3FFFF) >>> 1] = value;" +
"	}" +
"	else if (address >= " + flashmemoryaddress + " && address < " + (flashmemoryaddress + flashmemorysize) + ") {" + // Flash write support.
"		if ((state.pc < 0x40000) && !state.Protection_enabled) {" + // This write runs from RAM, with Protection disabled... chances are that we want to switch to the special mode.
//"stdlib.console.log(\"Switch to special\");" +
"			ww = ww_" + suffix + "_flashspecial;" + // Redefine functions
"			rw = rw_" + suffix + "_flashspecial;" +
"			rb = rb_" + suffix + "_flashspecial;" +
"			ww_" + suffix + "_flashspecial(address, value);" + // Forward to special function
"		}" +
"	}" +
"	else if (address >= 0x600000 && address < 0x800000) {" +
"		write_hreg(address, (value >> 8) & 0xFF);" +
"		write_hreg(address + 1, value & 0xFF);" +
"	}" +
"}";
	eval(memory_write_function);

	memory_write_function =
"wb_" + suffix + "_normal = function wb_" + suffix + "_normal(address, value)" +
"{" +
"	address = address & 0xFFFFFF;" +
"	if (address < " + ((suffix != "9") ? "0x200000" : "0x40000") + ") {" + // RAM and ghosts < 0x200000
"		address &= 0x3FFFF;" +
"		if ((address & 1) == 0) {" +
"			state.ram[address >>> 1] = (state.ram[address >>> 1] & 0xFF) + (value * 256);" +
"		}" +
"		else {" +
"			state.ram[address >>> 1] = (state.ram[address >>> 1] & 0xFF00) + value;" +
"		}" +
"	}" +
// Flash write bytes not implemented for now - does anyone use them ?
"	else if (address >= 0x600000 && address < 0x800000) {" +
"		write_hreg(address, value & 0xFF);" +
"	}" +
"}";
	eval(memory_write_function);

	memory_write_function =
"ww_" + suffix + "_flashspecial = function ww_" + suffix + "_flashspecial(address, value)" +
"{" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 0; fire_cpu_exception(3); };" + // Address Error
"	address = address & 0xFFFFFE;" +
"	if (address < " + ((suffix != "9") ? "0x200000" : "0x40000") + ") {" + // RAM and ghosts < 0x200000
"		state.ram[(address & 0x3FFFF) >>> 1] = value;" +
"	}" +
"	else if (address >= " + flashmemoryaddress + " && address < " + (flashmemoryaddress + flashmemorysize) + ") {" +
"		if (state.flash_write_ready) {" + // Write the value to Flash, if we're ready.
"			state.rom[(address - " + flashmemoryaddress + ") >>> 1] &= value;" +
"			state.flash_write_ready--;" +
"			state.flash_ret_or = 4294967295;" +
"		}" +
"		else if (value == 0x5050) {" + // Clear status register
"			state.flash_write_phase = 0x50;" +
"		}" +
"		else if (value == 0x9090) {" + // Read identifier codes
"			state.flash_write_phase = 0x90;" +
"		}" +
"		else if (value == 0x1010) {" + // Byte write setup/confirm
"			if (state.flash_write_phase == 0x50) {" +
"				state.flash_write_ready = 1;" +
"				state.flash_write_phase = 0x50;" +
"			}" +
"		}" +
"		else if (value == 0x2020) {" + // Block erase setup/confirm
"			if (state.flash_write_phase == 0x50) {" +
"				state.flash_write_phase = 0x20;" +
"			}" +
"		}" +
"		else if (value == 0xD0D0) {" + // Confirm and block erase
"			if (state.flash_write_phase == 0x20) {" +
"				state.flash_write_phase = 0xd0;" +
"				state.flash_ret_or = 4294967295;" +
"				address &= 0xFF0000;" +
"				address -= " + flashmemoryaddress + ";" +
"				address >>>= 1;" +
"				for (var i = 0; i < 65536/2; i++, address++) {" +
"					state.rom[address] = 0xFFFF;" +
"				}" +
"			}" +
"		}" +
"		else if (value == 0xFFFF) {" + // read array/reset
"			if (state.flash_write_phase == 0x50 || state.flash_write_phase == 0x90) {" +
"				state.flash_write_ready = 0;" +
"				state.flash_ret_or = 0;" +
//"stdlib.console.log(\"Switch to normal\");" +
"				ww = ww_" + suffix + "_normal;" + // Redefine functions
"				rw = rw_" + suffix + "_normal;" +
"				rb = rb_" + suffix + "_normal;" +
"			}" +
"		}" +
"	}" +
"	else if (address >= 0x600000 && address < 0x800000) {" +
"		write_hreg(address, (value >> 8) & 0xFF);" +
"		write_hreg(address + 1, value & 0xFF);" +
"	}" +
"}";
	eval(memory_write_function);
}

build_memory_write_functions("1", 0x400000, 0x200000); // 92+
build_memory_write_functions("3", 0x200000, 0x200000); // 89
build_memory_write_functions("8", 0x200000, 0x400000); // V200
build_memory_write_functions("9", 0x800000, (state.large_flash_memory ? 0x800000 : 0x400000)); // 89T

function wl(address, value)
{
	ww(address, value >>> 16);
	ww(address + 2, value & 0xFFFF);
}

// Dummy implementations, will be overridden later.
function store_multiple(address, mask, size) { }
function store_multiple_predec(address, mask, size) { }
function load_multiple_postinc(address, mask, size) { }
function load_multiple(address, mask, size) { }

// MOVEM handlers. We generate them because eval() takes a severe toll on performance (about an order of magnitude).
// Might optimize them further (on average) by splitting all loops in 2, and returning if mask == 0.
// NOTE: constant-propagating size into the functions' body (splitting each movem handler in two) _slows down_ emulation, for some reason, at least on Firefox. Yes, really.
function build_movem_handlers() {
	var reg;

// store_multiple
	var movem_handler =
"store_multiple = function store_multiple(address, mask, size) {" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 0; fire_cpu_exception(3); };" + // Address Error
"	address = address & 0xFFFFFE;" +
"	if (size == 1) {";
	for (reg = 0; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			ww(address, state.d" + reg + ");" +
"			address += 2;" +
"		}" +
"		mask >>>= 1;";
	}
	for (reg = 0; reg <= 3; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			ww(address, state.a" + reg + ");" +
"			address += 2;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "if (!mask) return;";
	for (reg = 4; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			ww(address, state.a" + reg + ");" +
"			address += 2;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "	}" +
"	else {";
	for (reg = 0; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			wl(address, state.d" + reg + ");" +
"			address += 4;" +
"		}" +
"		mask >>>= 1;";
	}
	for (reg = 0; reg <= 3; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			wl(address, state.a" + reg + ");" +
"			address += 4;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "if (!mask) return;";
	for (reg = 4; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			wl(address, state.a" + reg + ");" +
"			address += 4;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler +=  "	}" +
"}";
	eval(movem_handler);

// store_multiple_predec
	movem_handler =
"store_multiple_predec = function store_multiple_predec(address, mask, size)" +
"{" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 0; fire_cpu_exception(3); };" + // Address Error
"	address = address & 0xFFFFFE;" +
"	if (size == 1) {";
	for (reg = 7; reg >= 0; reg--) {
		movem_handler += "		if (mask & 1) {" +
"			address -= 2;" +
"			ww(address, state.a" + reg + ");" +
"		}" +
"		mask >>>= 1;";
	}
	for (reg = 7; reg >= 4; reg--) {
		movem_handler += "		if (mask & 1) {" +
"			address -= 2;" +
"			ww(address, state.d" + reg + ");" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "if (!mask) return address;";
	for (reg = 3; reg >= 0; reg--) {
		movem_handler += "		if (mask & 1) {" +
"			address -= 2;" +
"			ww(address, state.d" + reg + ");" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "	}" +
"	else {";
	for (reg = 7; reg >= 0; reg--) {
		movem_handler += "		if (mask & 1) {" +
"			address -= 4;" +
"			wl(address, state.a" + reg + ");" +
"		}" +
"		mask >>>= 1;";
	}
	for (reg = 7; reg >= 4; reg--) {
		movem_handler += "		if (mask & 1) {" +
"			address -= 4;" +
"			wl(address, state.d" + reg + ");" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "if (!mask) return address;";
	for (reg = 3; reg >= 0; reg--) {
		movem_handler += "		if (mask & 1) {" +
"			address -= 4;" +
"			wl(address, state.d" + reg + ");" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "	}" +
"	return address;" +
"}";
	eval(movem_handler);

// load_multiple
	movem_handler =
"load_multiple = function load_multiple(address, mask, size)" +
"{" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 1; fire_cpu_exception(3); };" + // Address Error
"	address = address & 0xFFFFFE;" +
"	if (size == 1) {";
	for (reg = 0; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = ewl(rw(address));" +
"			address += 2;" +
"			state.d" + reg + "= value;" +
"		}" +
"		mask >>>= 1;";
	}
	for (reg = 0; reg <= 3; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = ewl(rw(address));" +
"			address += 2;" +
"			state.a" + reg + "= value;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "if (!mask) return;";
	for (reg = 4; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = ewl(rw(address));" +
"			address += 2;" +
"			state.a" + reg + "= value;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "	}" +
"	else {";
	for (reg = 0; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = rl(address);" +
"			address += 4;" +
"			state.d" + reg + "= value;" +
"		}" +
"		mask >>>= 1;";
	}
	for (reg = 0; reg <= 3; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = rl(address);" +
"			address += 4;" +
"			state.a" + reg + "= value;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "if (!mask) return;";
	for (reg = 4; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = rl(address);" +
"			address += 4;" +
"			state.a" + reg + "= value;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "	}" +
"}";
	eval(movem_handler);

// load_multiple_postinc
	movem_handler =
"load_multiple_postinc = function load_multiple_postinc(address, mask, size)" +
"{" +
"	if ((address & 1) != 0) { state.address_error_address = address; state.address_error_access_type = 1; fire_cpu_exception(3); };" + // Address Error
"	address = address & 0xFFFFFE;" +
"	if (size == 1) {";
	for (reg = 0; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = ewl(rw(address));" +
"			address += 2;" +
"			state.d" + reg + "= + value;" +
"		}" +
"		mask >>>= 1;";
	}
	for (reg = 0; reg <= 3; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = ewl(rw(address));" +
"			address += 2;" +
"			state.a" + reg + "= + value;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "if (!mask) return address;";
	for (reg = 4; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = ewl(rw(address));" +
"			address += 2;" +
"			state.a" + reg + "= + value;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "	}" +
"	else {";
	for (reg = 0; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = rl(address);" +
"			address += 4;" +
"			state.d" + reg + "= value;" +
"		}" +
"		mask >>>= 1;";
	}
	for (reg = 0; reg <= 3; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = rl(address);" +
"			address += 4;" +
"			state.a" + reg + "= + value;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "if (!mask) return address;";
	for (reg = 4; reg <= 7; reg++) {
		movem_handler += "		if (mask & 1) {" +
"			var value = rl(address);" +
"			address += 4;" +
"			state.a" + reg + "= + value;" +
"		}" +
"		mask >>>= 1;";
	}
	movem_handler += "	}" +
"	return address;" +
"}";
	eval(movem_handler);
}
build_movem_handlers();

// Most frequently used functions, according to profiling AMS 2.03 on Firefox Nightly on 2013/07/08.
/*stdlib.console.log("19679\t" + n[19679]);
stdlib.console.log("19694\t" +n[19694]);
stdlib.console.log("18663\t" +n[18663]);
stdlib.console.log("2050\t" +n[2050]);
stdlib.console.log("20083\t" +n[20083]);
stdlib.console.log("28672\t" +n[28672]);
stdlib.console.log("4604\t" +n[4604]);
stdlib.console.log("12840\t" +n[12840]);
stdlib.console.log("20085\t" +n[20085]);
stdlib.console.log("20936\t" +n[20936]);
stdlib.console.log("45672\t" +n[45672]);
stdlib.console.log("26368\t" +n[26368]);
stdlib.console.log("26112\t" +n[26112]);
stdlib.console.log("20153\t" +n[20153]);
stdlib.console.log("8828\t" +n[8828]);
stdlib.console.log("58760\t" +n[58760]);
stdlib.console.log("20154\t" +n[20154]);
stdlib.console.log("13329\t" +n[13329]);
stdlib.console.log("16952\t" +n[16952]);
stdlib.console.log("2048\t" +n[2048]);
stdlib.console.log("8316\t" +n[8316]);
stdlib.console.log("12306\t" +n[12306]);
stdlib.console.log("18172\t" +n[18172]);*/

function initemu()
{
	state.sr = 0;

	if (!checkemu()) {
		stdlib.console.log("Emulation checks failed");
		return;
	}

	if (!detect_calculator_model()) {
		stdlib.console.log("Couldn't detect calculator model");
		ui.display_no_rom_loaded();
		return;
	}

	ui.setCalculatorModel(state.calculator_model);
	link.setCalculatorModel(state.calculator_model);
	ui.initemu();

	initialize_calculator();
	main_interval_timer_id = stdlib.setInterval(emu_main_loop, state.main_interval_timer_interval);

	for (var key = 0; key < 80; key++) state.keystatus[key] = 0;

	ui.initkeyhandlers();
};

function setKey(keynumber, status)
{
	//var prev = state.keystatus[keynumber];
	state.keystatus[keynumber] = status;
	// FIXME: this was simple, and used to be better than nothing... but it's wrong.
	// After adding pending interrupt mechanism, keyboard handling works better if this interrupt is not triggered.
	/*if (!prev && status) {
		raise_interrupt(2); // AUTO_INT_2
	}*/
}

function setONKeyPressed()
{
	//stdlib.console.log("ON pressed");
	state.port_60001A = 0x00;
	raise_interrupt(6); // AUTO_INT_6
}

function setONKeyReleased()
{
	state.port_60001A = 0x02;
	//stdlib.console.log("ON released");
}

// Detecting the calculator model in a generic way is harder than it could seem.
// There are many special cases, and here, we can't rely on libtifiles preparing the work for us...
// In TIEmu, see src/core/images.c::ti68k_get_rom_infos() and src/core/hwpm.c::ti68k_get_hw_param_block().
function detect_calculator_model()
{
	if (typeof(state.rom) !== "object") {
		return false;
	}
	state.jmp_tbl = state.rom[(0x12088 + 0xC8) >>> 1] * 65536 + state.rom[((0x12088 + 0xC8) >>> 1) + 1]; // Jump table, if any
	state.pedrom = (state.rom[(0x12088 + 0x32) >>> 1] == 0x524F); // PedroM has kernel type "RO", AMS and Punix have no kernel type.
	state.punix = (state.jmp_tbl == 0); // Punix doesn't have an AMS-style jump table.
	var OSsize;

	switch (state.rom[0x12000 >>> 1]) {
		case 0x800F: // Size on 4 bytes
		{
			OSsize = state.rom[0x12002 >>> 1] * 65536 + state.rom[0x12004 >>> 1];
			if (state.rom[0x12006 >>> 1] == 0x8011) { // Calculator model
				state.calculator_model = (state.rom[0x12008 >>> 1] & 0xFF00) >>> 8;
			}
			else {
				stdlib.console.log("Unhandled calculator model scheme or invalid data");
				return false;
			}
			break;
		}
		case 0x800E: // Size on 2 bytes
		{
			OSsize = state.rom[0x12002 >>> 1];
			if (state.rom[0x12004 >>> 1] == 0x8011) { // Calculator model
				state.calculator_model = (state.rom[0x12006 >>> 1] & 0xFF00) >>> 8;
			}
			else {
				stdlib.console.log("Unhandled calculator model scheme or invalid data");
				return false;
			}
			break;
		}
		default: // Probably invalid data, since valid OS upgrades are unlikely to have less than 256 bytes of code+data.
		{
			stdlib.console.log("Unhandled OS size scheme or invalid data");
			return false;
		}
	}
	//stdlib.console.log("OS size is " + OSsize + " bytes (+ header and signature)");

	switch (state.calculator_model) {
		case 1: state.ROM_base = 0x400000; state.FlashMemorySize = 0x200000; break; // 92+
		case 3: state.ROM_base = 0x200000; state.FlashMemorySize = 0x200000; break; // 89
		case 8: state.ROM_base = 0x200000; state.FlashMemorySize = 0x400000; break; // V200
		case 9: state.ROM_base = 0x800000; state.FlashMemorySize = (state.large_flash_memory ? 0x800000 : 0x400000); break; // 89T
		default: return false;
	}

	// Post-process hardware model from the information contained in HWPB, if any.
	var hwpbaddress = state.rom[0x104 / 2] * 65536 + state.rom[0x106 / 2]; // Address of HWPB, if any.
	if (hwpbaddress >= state.ROM_base && hwpbaddress <= state.ROM_base + state.FlashMemorySize) {
		// There's a HWPB in this image.
		var hwpboffset = (hwpbaddress - state.ROM_base) >>> 1;
		var hwpbsize = state.rom[hwpboffset]; // Read size bytes.
		//stdlib.console.log("hwpbaddress=" + to_hex(hwpbaddress, 6) + " hwpboffset=" + to_hex(hwpboffset, 6) + " hwpbsize=" + to_hex(hwpbsize, 4));
		if (hwpbsize >= 6) {
			// There's a hardware ID field in this HWPB.
			state.calculator_model = state.rom[hwpboffset + 1] * 65536 + state.rom[hwpboffset + 2];
			//stdlib.console.log("calculator_model=" + calculator_model);
			if (state.calculator_model == 8 && state.ROM_base == 0x400000) {
				stdlib.console.log("Detected V200 ROM patched as 92+, forcing 92+ model");
				state.calculator_model = 1; state.FlashMemorySize = 0x200000;
			}
			else if (state.calculator_model == 9 && state.ROM_base == 0x200000) {
				stdlib.console.log("Detected 89T ROM patched as 89, forcing 89 model");
				state.calculator_model = 3; state.FlashMemorySize = 0x200000;
			}
		}

		if (hwpbsize >= 0x18) {
			// There's a gate array field in this HWPB.
			state.hardware_model = state.rom[hwpboffset + 11] * 65536 + state.rom[hwpboffset + 12];
		}
		else {
			// HWPB is too short (shouldn't occur for V200 or 89T), use default value.
			state.hardware_model = (state.calculator_model == 9) ? 3 : ((state.calculator_model == 8) ? 2 : 1); // Assume HW3 for 89T, HW2 for V200 (always correct), HW1 for 89 & 92+.
		}
	}
	else {
		// There's no HWPB in this image
		state.hardware_model = (state.calculator_model == 9) ? 3 : ((state.calculator_model == 8) ? 2 : 1); // Assume HW3 for 89T, HW2 for V200 (always correct), HW1 for 89 & 92+.

		// Create fake HWPB
		stdlib.console.log("Creating fake HWPB");
		state.rom[0x104 / 2] = state.ROM_base >>> 16; // Address of the HWPB
		state.rom[0x106 / 2] = 0x0108;
		state.rom[0x108 / 2] = 0x0018; // Size of the HWPB
		state.rom[0x10A / 2] = 0x0000; // Hardware ID
		state.rom[0x10C / 2] = state.calculator_model;
		state.rom[0x10E / 2] = 0x0000; // Hardware revision
		state.rom[0x110 / 2] = 0x0001;
		state.rom[0x112 / 2] = 0x0000; // Boot major
		state.rom[0x114 / 2] = 0x0001;
		state.rom[0x116 / 2] = 0x0000; // Boot revision
		state.rom[0x118 / 2] = 0x0001;
		state.rom[0x11A / 2] = 0x0000; // Boot build
		state.rom[0x11C / 2] = 0x0001;
		state.rom[0x11E / 2] = 0x0000; // Gate array
		state.rom[0x120 / 2] = state.hardware_model;
	}

	return true;
}

var reset = false;

function initialize_calculator()
{
	reset_calculator();

	reset(); // run code from v12sav to skip ahead
}

function reset_calculator()
{
	if (state.erase_ram_upon_reset) {
		for (var b = 0; b < 131072; b++) {
			state.ram[b] = 0;
		}
	}

	ui.reset();

	for (var i = 0; i < 128; i++) state.ram[i] = state.rom[i + (0x12088 / 2)];

	// Redefine memory read / write functions
	if (state.calculator_model == 1) { // 92+
		rb = rb_1_normal; rw = rw_1_normal; wb = wb_1_normal; ww = ww_1_normal;
	}
	else if (state.calculator_model == 3) { // 89
		rb = rb_3_normal; rw = rw_3_normal; wb = wb_3_normal; ww = ww_3_normal;
	}
	else if (state.calculator_model == 8) { // V200
		rb = rb_8_normal; rw = rw_8_normal; wb = wb_8_normal; ww = ww_8_normal;
	}
	else if (state.calculator_model == 9) { // 89T
		rb = rb_9_normal; rw = rw_9_normal; wb = wb_9_normal; ww = ww_9_normal;
	}
	else {
		stdlib.console.log("Invalid calculator type");
	}

	// Detect starting address.
	var initial_ssp = state.rom[0] * 65536 + state.rom[1];
	var initial_pc = state.rom[2] * 65536 + state.rom[3];
	if (   initial_ssp >= 0 && initial_ssp < 0x40000
	    && initial_pc >= state.ROM_base && initial_pc < state.ROM_base + state.FlashMemorySize
	    && state.rom[0x10000 >>> 1] == 0xFFF8) {
		stdlib.console.log("Detected reasonably valid initial SSP=" + to_hex(initial_ssp, 8) + ", PC=" + to_hex(initial_pc, 8) + " in boot code, and marker in certificate memory: will boot from boot code");
		state.pc = initial_pc;
		state.prev_pc = state.pc;
		state.a7 = initial_ssp;
		state.a8 = initial_ssp;

		// Set marker in certificate memory, otherwise the boot code will display "Corrupt Certificate memory" and enter infinite loop.
		/*if (rom[0x10000 >>> 1] == 0xFFFF) {
			stdlib.console.log("Setting marker in certificate memory");
			rom[0x10000 >>> 1] = 0xFFF8;
		}*/
	}
	else {
		initial_ssp = state.rom[0x12088 >>> 1] * 65536 + state.rom[0x1208A >>> 1];
		initial_pc = state.rom[0x1208C >>> 1] * 65536 + state.rom[0x1208E >>> 1];
		if (initial_ssp >= 0 && initial_ssp < 0x40000 && initial_pc >= state.ROM_base && initial_pc < state.ROM_base + state.FlashMemorySize) {
			state.pc = initial_pc;
			state.prev_pc = state.pc;
			state.a7 = initial_ssp;
			state.a8 = initial_ssp;
		}
		else {
			stdlib.console.log("Detected no valid initial SSP and PC !");
		}
	}

	state.sr = 0x2700;

	state.cycle_count = 0;

	link.reset_arrays();
}

function raise_interrupt(i)
{
	if (state.stopped)
	{
		// these always resume
		if (i == 6 || i == 7)
		{
			stdlib.console.log("Resuming from stop due to AUTO_INT_6 or AUTO_INT_7, wakemask=" + to_hex(state.wakemask, 2));
			state.stopped = false;
			//tracecount = 30;
		}
		else
		{
			// these only resume if the right bit is set
			if (state.wakemask & (1 << (i - 1)))
			{
				//stdlib.console.log("Resuming from stop due to AUTO_INT_" + i + ", wakemask=" + to_hex(wakemask, 2));
				state.stopped = false;
			}
		}
	}

	state.pending_ints |= 1 << i;
}

function fire_cpu_exception(e)
{
	/*stdlib.console.log(e);
	print_status();*/
	// skip auto interrupt if current level too high
	if (e >= 25 && e <= 30)
	{
		var interrupt_level = e - 24;
		var current_level = (state.sr & 0x700) >> 8;
		if (current_level >= interrupt_level) 
		{
			return;
		}
	}

	var oldsr = state.sr;
	update_sr(state.sr | 0x2000);

	state.a7 -= 4; // push pc on supervisor stack
	wl(state.a7, state.pc);
	state.a7 -= 2; // push sr on supervisor stack
	ww(state.a7, oldsr);
	state.pc = rl(e * 4); // load new PC from vector table
	// For address error and bus error, the stack frame is more complicated.
	if (e == 2 || e == 3) {
		state.a7 -= 2;
		ww(state.a7, state.current_instruction); // Instruction register.
		state.a7 -= 4;
		wl(state.a7, state.address_error_address); // Access address
		state.a7 -= 2;
		var access_type = state.address_error_access_type << 4 + state.reading_instruction << 3;
		// 0 0 1 User data
		// 0 1 0 User program
		// 1 0 1 Supervisor data
		// 1 1 0 Supervisor program
		if (oldsr & 0x2000) {
			state.address_error_access_type |= 4;
		}
		if (state.reading_instruction) {
			state.address_error_access_type |= 2;
		}
		else {
			state.address_error_access_type |= 1;
		}
		ww(state.a7, state.address_error_access_type);

		console.log(to_hex(rw(state.a7), 4) + " " + to_hex(rw(state.a7+2), 4) + " " + to_hex(rw(state.a7+4), 4) + " " + to_hex(rw(state.a7+6), 4) + " " + to_hex(rw(state.a7+8), 4) + " " + to_hex(rw(state.a7+10), 4) + " " + to_hex(rw(state.a7+12), 4));
	}

	// set interrupt level for auto interrupt
	if (e >= 25 && e <= 31) {
		state.sr &= 0xF8FF;
		var new_level = e - 24;
		state.pending_ints &= 255 - (1 << new_level);
		state.sr += new_level * 256;
	}
}

// Timer handling was extracted out of main_loop to help profiling.
function timer_interrupts()
{
	state.osc2_counter += 32; // That's supposed to be the correct value, but the AMS UI is annoying...

	if (state.osc2_counter >= 0x1000000) state.osc2_counter -= 0x1000000;

	// check master interrupt control (bit 7, needs to be clear).
	if ((state.interrupt_control & 0x80) == 0)
	{
		// Only if OSC2 enabled
		if (state.interrupt_control & 2)
		{
			// Trigger level 1 interrupt
			if ((state.osc2_counter & 0x7FF) == 0)
				raise_interrupt(1); // AUTO_INT_1

			// Programmable timer
			if (((state.osc2_counter % state.interrupt_rate) == 0) && (state.interrupt_control & 8))
			{
				if (state.timer_current == 0)
					state.timer_current = state.timer_min;
				else
					state.timer_current++;
				if (state.timer_current >= 256)
				{
					state.timer_current = 0;
					raise_interrupt(5); // AUTO_INT_5
				}
			}
		}

		// HW1: trigger level 3 interrupt if enabled and OSC2 enabled.
		// HW2+: trigger level 3 interrupt if enabled, even if OSC2 stopped.
		if (   (state.osc2_counter & 0x7FFFF) == 0
		    && (state.interrupt_control & 4)
		    && ((state.hardware_model == 1 && (state.interrupt_control & 2)) || (state.hardware_model > 1)))
		{
			//stdlib.console.log("Triggering AUTO_INT_3");
			raise_interrupt(3); // AUTO_INT_3
		}
	}
}

function execute_instructions(number)
{
	var t = cpu.t;
	var cycles = cpu.cycles;
	for (var inner = 0; inner < number; inner++) {
		state.prev_pc = state.pc;
		state.reading_instruction = 0;
		state.current_instruction = rw(state.pc);
		if (typeof(state.current_instruction) === "undefined") {
			print_status();
			stdlib.console.log(to_hex(state.pc, 9));
			stdlib.clearInterval(main_interval_timer_id);
			throw "e";
		}
		state.reading_instruction = 1;
		if (state.tracecount > 0) {
			state.tracecount--;
			if (state.overall > 0) {
				state.overall--;
				print_status();
			}
		}
		//if (pc == 0x48d6) tracecount = 20;
		state.pc += 2;
		//try {
			state.cycle_count += cycles[state.current_instruction];
			t[state.current_instruction]();
		if (state.stopped == true) {
			return;
		}
		/*}
		catch (e) {
			if (e == "STOP")
			{
				stopped = true;
				//stdlib.console.log("stopped at " + to_hex(pc,9) + " SR = " + to_hex(sr,5));
				return;
			}
			else if (isNaN(e) || e < 0 || e > 255 || e != Math.floor(e))
			{
				// this is a real javascript exception
				stdlib.console.log("real javascript exception " + e);
				if (e.stack.length < 2000) {
					stdlib.console.log(e.stack);
				}
				else {
					stdlib.console.log(e.stack.substr(e.stack.length - 2000, 2000));
				}
				stdlib.clearInterval(main_interval_timer_id);
				return;
			}
		}*/

		// Raise highest level pending interrupt.
		if (state.pending_ints) {
			var mask = 0x80;
			for (var level = 7; level != 0; level--) {
				if (state.pending_ints & mask) {
					if ((level > (state.sr & 0x700) >> 8) || (level == 7)) {
						fire_cpu_exception(level + 24);
						state.pending_ints &= 255 - (1 << level);
					}
				}
				mask >>= 1;
			}
		}
	}
}

/*function execute_one_instruction()
{
	state.prev_pc = state.pc;
	state.current_instruction = rw(state.pc);
	state.pc += 2;
	state.cycle_count += cycles[state.current_instruction];
	t[state.current_instruction]();
}*/

function emu_main_loop()
{
	if (state.unhandled_count >= 10) return;

	var starttime = (new Date).getTime();
	var started = false;

	// The cost of exception handling is noticeable...
	//try {
		// The LCD refreshes every 8192 OSC2 cycles (by default)
		for (var outer = 0; outer < state.screen_height * 2 /*&& unhandled_count < 10*/; outer++)
		{
			// Assume we can run 2 instructions per OSC2 cycle, so 64 instructions between programmable interrupt counts (every 32 cycles).
			// We get about 744khz OSC2 rate here, which comes out to around 1.49 million instructions per second, 
			// which is fairly reasonable depending on your instruction mix.
			if (!state.stopped)
			{
				//try {
					execute_instructions(64);
				/*}
				catch (e) {
					if (e == "STOP")
					{
						stopped = true;
						//stdlib.console.log("stopped at " + to_hex(pc,9) + " SR = " + to_hex(sr,5));
					}
					else if (isNaN(e) || e < 0 || e > 255 || e != Math.floor(e))
					{
						// this is a real javascript exception
						stdlib.console.log("real javascript exception " + e);
						stdlib.console.log(e.stack);
						stdlib.clearInterval(main_interval_timer_id);
						return;
					}
				}*/
			}

			timer_interrupts();

			// link interrupts
			link.link_handling();
		}
	/*}
	catch (e) {
		if (e == "STOP")
		{
			stopped = true;
			//stdlib.console.log("stopped at " + to_hex(pc,9) + " SR = " + to_hex(sr,5));
		}
		else if (isNaN(e) || e < 0 || e > 255 || e != Math.floor(e))
		{
			// this is a real javascript exception
			stdlib.console.log("real javascript exception " + e);
			stdlib.console.log(e.stack);
			stdlib.clearInterval(main_interval_timer_id);
			return;
		}
	}*/

	if (state.hardware_model == 1) {
		ui.draw_screen(((state.lcd_address_high << 8) + state.lcd_address_low) << (3 - 1), state.ram);
	}
	else {
		ui.draw_screen(state.lcd_address >>> 1, state.ram);
		// Toggle FS bit
	}
	toggle_framesync();

	var endtime = (new Date).getTime();

	state.total_time += (endtime - starttime);
	state.frames_counted++;

	if (state.frames_counted == 1000)
	{
		//ui.set_title("Average milliseconds for the last 1000 frames is " + (state.total_time/1000));
		state.total_time = state.frames_counted = 0;
	}

	if (newromready)
	{
		handle_newromready();
	}

	if (newfileready)
	{
		handle_newfileready();
	}

	if (newflashfileready)
	{
		handle_newflashfileready();
	}
}

function handle_newromready()
{
	var inputrom = newromready.result;
	newromready = false;
	var buf = new Uint8Array(inputrom);
	if (inputrom.byteLength == 0x200000 || inputrom.byteLength == 0x400000)
	{
		stdlib.console.log("Processing plain ROM image");
		rom = new Uint16Array(inputrom.byteLength / 2);
		for (var x = 0; x < inputrom.byteLength; x += 2)
		{
			state.rom[x / 2] = buf[x] * 256 + buf[x + 1];
		}
		initemu();
	}
	else
	{
		stdlib.console.log("Processing TIB/9XU image");
		var start = 0;
		if (buf[0] == 0x2A && buf[1] == 0x2A && buf[2] == 0x54 && buf[3] == 0x49 && buf[4] == 0x46 && buf[5] == 0x4C && buf[6] == 0x2A && buf[7] == 0x2A)
		{
			for (var test = 0; test < inputrom.byteLength - 8; test++)
			{
				// "basecode"
				if (buf[test] == 0x62 && buf[test+1] == 0x61 && buf[test+2] == 0x73 && buf[test+3] == 0x65 && buf[test+4] == 0x63 && buf[test+5] == 0x6f && buf[test+6] == 0x64 && buf[test+7]== 0x65)
				{
					start = test + 0x3d;
					break;
				}
			}
		}
		stdlib.console.log("Offset = " + start);

		state.rom = new Uint16Array(0x800000 / 2); // Allocate an array of maximum size (0x800000 due to experimental large memory support for 89T);
		var offset = 0;
		for (offset = 0; offset < 0x12000 / 2; offset++) {
			state.rom[offset] = 5120;  // 0x1400
		}

		for (var x = start; x < inputrom.byteLength; x += 2)
		{
			state.rom[offset] = buf[x] * 256 + buf[x + 1];
			offset++;
		}
		while (offset < state.rom.length) {
			state.rom[offset] = 0xFFFF;
			offset++;
		}
		initemu();
		state.rom = state.rom.subarray(0, state.FlashMemorySize / 2); // Reduce array size if possible.
		//overall = 150; tracecount = 50;
	}
}

function handle_newfileready()
{
	var buf;
	if (typeof(newfileready) == "object") { // The contents were loaded from a JS function further down
		if (newfileready instanceof Array) { // The contents were stored directly into an array
			buf = newfileready;
		}
		else {
			buf = new Uint8Array(newfileready.result);
		}
	}
	newfileready = false;

	var varname = new Array();
	for (var x = 0x0A; x < 0x12; x++)
	{
		if (buf[x] == 0) break;
		varname.push(buf[x]);
	}
	varname.push(0x5c); // backslash
	for (var x = 0x40; x < 0x48; x++)
	{
		if (buf[x] == 0) break;
		varname.push(buf[x]);
	}

	var vartype = buf[0x48];
	// Modify vartype according to the locked / archived byte (libticalcs: calc_89.c: send_var).
	if (buf[0x49] == 1) { // Locked
		vartype = 0x26;
	}
	else if (buf[0x49] == 2 || buf[0x49] == 3) { // Archived
		vartype = 0x27;
	}

	var data_len = buf[0x57] + buf[0x56] * 256;

	link.sendfile(varname, vartype, buf, data_len, 0x58, true); // Data starts at 0x58
}

function handle_newflashfileready()
{
	var buf;
	if (typeof(newflashfileready) == "object") { // The contents were loaded from a JS function further down
		if (newflashfileready instanceof Array) { // The contents were stored directly into an array
			buf = newflashfileready;
		}
		else {
			buf = new Uint8Array(newflashfileready.result);
		}
	}
	newflashfileready = false;

	var varname = new Array();
	for (var x = 0x11; x < 0x19; x++)
	{
		if (buf[x] == 0) break;
		varname.push(buf[x]);
	}

	var vartype = buf[0x31];

	var data_len = buf[0x4A] + buf[0x4B] * 256 + buf[0x4C] * 65536 + buf[0x4D] * 16777216;

	link.sendfile(varname, vartype, buf, data_len, 0x4E, false); // data starts at 0x4E
}

function loadrom(infile)
{
	stdlib.console.log("starting to read file " + infile.name);
	var extension = infile.name.toLowerCase().substr(-4);
	if ((infile.size == 0x200000 || infile.size == 0x400000) && extension == ".rom")
	{
		stdlib.console.log("Loading as plain ROM");
		var reader = new FileReader();
		reader.onload = function() { newromready = reader; state.unhandled_count = 0; handle_newromready(); };
		reader.readAsArrayBuffer(infile);
	}
	if (infile.size >= 1024 && infile.size < 0x400000 && (extension == ".tib" || extension == ".9xu" || extension == ".89u" || extension == ".v2u"))
	{
		stdlib.console.log("Starting to load as TIB / OS upgrade");
		var reader = new FileReader();
		reader.onload = function() { newromready = reader; state.unhandled_count = 0; handle_newromready(); };
		reader.readAsArrayBuffer(infile);
	}
	// tilp: MIME types definition.
	// libtifiles: types89.c.
	if (   infile.size >= 80
	    && infile.size < 70000
	    && (   ".9xa.89a.v2a".indexOf(extension) != -1 // Figure, infrequent
	        // TODO: handle .9xb.89b.v2b (Backup) some day.
	        || ".9xc.89c.v2c".indexOf(extension) != -1 // Data, infrequent
	        || ".9xd.89d.v2d".indexOf(extension) != -1 // GDB, infrequent
	        || ".9xe.89e.v2e".indexOf(extension) != -1 // Expression
	        || ".9xf.89f.v2f".indexOf(extension) != -1 // Function
	        // TODO: handle .9xg.89g.v2g and .tig (Group) some day.
	        || ".9xi.89i.v2i".indexOf(extension) != -1 // Image
	        // .9xk.89k.v2k (FlashApp) handled below.
	        || ".9xl.89l.v2l".indexOf(extension) != -1 // List
	        || ".9xm.89m.v2m".indexOf(extension) != -1 // Matrix
	        // .9xn.89n.v2n ?
	        || ".9xp.89p.v2p".indexOf(extension) != -1 // Program
	        // .9xq.89q.v2q (Certificate) handled below.
	        || ".9xs.89s.v2s".indexOf(extension) != -1 // String
	        || ".9xt.89t.v2t".indexOf(extension) != -1 // Text
	        // .9xu.89u.v2u (OS upgrade) handled above
	        || ".9xx.89x.v2x".indexOf(extension) != -1 // Macro, infrequent
	        || ".9xy.89y.v2y".indexOf(extension) != -1 // Other
	        || ".9xz.89z.v2z".indexOf(extension) != -1 // Assembly program
	       )) {
		stdlib.console.log("Starting to load as variable");
		var reader = new FileReader();
		reader.onload = function() { newfileready = reader; state.unhandled_count = 0; handle_newfileready(); };
		reader.readAsArrayBuffer(infile);
	}
	if (   infile.size >= 80
	    && (   ".9xk.89k.v2k".indexOf(extension) != -1 // FlashApp
	        //|| ".9xq.89q.v2q".indexOf(extension) != -1 // Certificate - useless nowadays since we can resign FlashApps
	       )) {
		stdlib.console.log("Starting to load as Flash variable");
		var reader = new FileReader();
		reader.onload = function() { newflashfileready = reader; state.unhandled_count = 0; handle_newflashfileready(); };
		reader.readAsArrayBuffer(infile);
	}
}

function check_ext() {
	var result;

	result = ebw(0x10);
	if (result != 0x10) {
		stdlib.console.log("ext 0 " + to_hex(result, 16));
		return false;
	}

	result = ebw(0x80);
	if (result != 0xFF80) {
		stdlib.console.log("ext 1 " + to_hex(result, 16));
		return false;
	}

	result = ewl(0x0100);
	if (result != 0x0100) {
		stdlib.console.log("ext 2 " + to_hex(result, 16));
		return false;
	}

	result = ewl(0x8000);
	if (result != 0xFFFF8000) {
		stdlib.console.log("ext 3 " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_subb() {
	var result;

	// TODO

	return true;
}

function check_cmpb() {
	var result;

	// TODO

	return true;
}

function check_addb() {
	var result;

	// TODO

	return true;
}

function check_subw() {
	var result;

	// TODO

	return true;
}

function check_cmpw() {
	var result;

	// TODO

	return true;
}

function check_addw() {
	var result;

	// TODO

	return true;
}

function check_subl() {
	var result;

	result = subl(0x12345678, 0x12345678);
	if (result != 0x0 || state.sr != 4) {
		stdlib.console.log("subl 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = subl(0x1234567, 0x12345678);
	if (result != 0x11111111 || state.sr != 0) {
		stdlib.console.log("subl 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = subl(0x23456789, 0x12345678);
	if (result != 0xEEEEEEEF || state.sr != 0x19) {
		stdlib.console.log("subl 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = subl(0x12345678, 0xFF000000);
	if (result != 0xECCBA988 || state.sr != 0x08) {
		stdlib.console.log("subl 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = subl(0xFF000000, 0x12345678);
	if (result != 0x13345678 || state.sr != 0x11) {
		stdlib.console.log("subl 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = subl(0x7FFFFFFF, 0x7FFFFFFF);
	if (result != 0 || state.sr != 4) {
		stdlib.console.log("subl 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = subl(0x7FFFFFFF, 0xFF000000);
	if (result != 0x7F000001 || state.sr != 0x02) {
		stdlib.console.log("subl 6 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = subl(0xFF000018, 0xFF000000);
	if (result != 0xFFFFFFE8 || state.sr != 0x19) {
		stdlib.console.log("subl 7 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_cmpl() {
	var result;

	state.sr = 0;

	result = cmpl(0x12345678, 0x12345678);
	if (result != 0x0 || state.sr != 4) {
		stdlib.console.log("cmpl 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = cmpl(0x1234567, 0x12345678);
	if (result != 0x11111111 || state.sr != 0) {
		stdlib.console.log("cmpl 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = cmpl(0x23456789, 0x12345678);
	if (result != 0xEEEEEEEF || state.sr != 0x09) {
		stdlib.console.log("cmpl 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0x10; // Force X to 1, so as to check that subsequent cmp don't modify it.

	result = cmpl(0x12345678, 0xFF000000);
	if (result != 0xECCBA988 || state.sr != 0x18) {
		stdlib.console.log("cmpl 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = cmpl(0xFF000000, 0x12345678);
	if (result != 0x13345678 || state.sr != 0x11) {
		stdlib.console.log("cmpl 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = cmpl(0x7FFFFFFF, 0xFF000000);
	if (result != 0x7F000001 || state.sr != 0x12) {
		stdlib.console.log("cmpl 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0; // Force X back to 0.

	result = cmpl(0xFF000018, 0xFF000000);
	if (result != 0xFFFFFFE8 || state.sr != 0x9) {
		stdlib.console.log("cmpl 6 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = cmpl(0xFF000000, 0x320);
	if (state.sr != 0x1) {
		stdlib.console.log("cmpl 7 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_addl() {
	var result;

	result = addl(0x12345678, 0x12345678);
	if (result != 0x2468ACF0 || state.sr != 0) {
		stdlib.console.log("addl 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = addl(0x1234567, 0x12345678);
	if (result != 0x13579BDF || state.sr != 0) {
		stdlib.console.log("addl 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = addl(0x23456789, 0x12345678);
	if (result != 0x3579BE01 || state.sr != 0) {
		stdlib.console.log("addl 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = addl(0x12345678, 0xFF000000);
	if (result != 0x11345678 || state.sr != 0x11) {
		stdlib.console.log("addl 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = addl(0x7FFFFFFF, 0x7FFFFFFF);
	if (result != 0xFFFFFFFE || state.sr != 0xA) {
		stdlib.console.log("addl 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = addl(0x7FFFFFFF, 0xFF000000);
	if (result != 0x7EFFFFFF || state.sr != 0x11) {
		stdlib.console.log("addl 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = addl(0xFF000018, 0xFF000000);
	if (result != 0xFE000018 || state.sr != 0x19) {
		stdlib.console.log("addl 6 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_abcd() {
	var result;

	state.sr = 4;

	result = abcd(0x00, 0x00);
	if (result != 0x0 || state.sr != 4) { // Z should be unchanged.
		stdlib.console.log("abcd 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;

	result = abcd(0x00, 0x00);
	if (result != 0x0 || state.sr != 0) { // Z should be unchanged.
		stdlib.console.log("abcd 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = abcd(0x00, 0x01);
	if (result != 0x1 || state.sr != 0) { // Z should be clear
		stdlib.console.log("abcd 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 4;

	result = abcd(0x01, 0x01);
	if (result != 0x2 || state.sr != 0) {
		stdlib.console.log("abcd 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 4;

	result = abcd(0x01, 0x09);
	if (result != 0x10 || state.sr != 0) {
		stdlib.console.log("abcd 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 12; // N + Z

	result = abcd(0x01, 0x99);
	if (result != 0x00 || state.sr != 0x15) { // X and C set, Z unchanged
		stdlib.console.log("abcd 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0x11; // X, C
	result = abcd(0x00, 0x99);
	if (result != 0x00 || state.sr != 0x11) { // The carry should remain
		stdlib.console.log("abcd 6 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = abcd(0x00, 0x99);
	if (result != 0x00 || state.sr != 0x11) { // The carry should remain
		stdlib.console.log("abcd 7 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_sbcd() {
	var result;

	state.sr = 4;

	result = sbcd(0x00, 0x00);
	if (result != 0x0 || state.sr != 4) { // Z should be unchanged
		stdlib.console.log("sbcd 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;

	result = sbcd(0x00, 0x00);
	if (result != 0x0 || state.sr != 0) { // Z should be unchanged
		stdlib.console.log("sbcd 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = sbcd(0x00, 0x01);
	if (result != 0x99 || (state.sr & 0x15) != 0x11) { // There was a borrow.
		stdlib.console.log("sbcd 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = sbcd(0x01, 0x01);
	if (result != 0x99 || (state.sr & 0x15) != 0x11) { // There was a borrow.
		stdlib.console.log("sbcd 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;

	result = sbcd(0x01, 0x01);
	if (result != 0x0 || state.sr != 0x0) { // There was no borrow.
		stdlib.console.log("sbcd 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_nbcd() {
	var result;

	state.sr = 4;

	result = nbcd(0x00);
	if (result != 0x0 || state.sr != 4) { // Z should be unchanged
		stdlib.console.log("nbcd 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;

	result = nbcd(0x01);
	if (result != 0x99 || (state.sr & 0x15) != 0x11) { // X, C but not Z
		stdlib.console.log("nbcd 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = nbcd(0x02);
	if (result != 0x97 || (state.sr & 0x15) != 0x11) { // X, C but not Z
		stdlib.console.log("nbcd 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = nbcd(0x09);
	if (result != 0x91 || (state.sr & 0x15) != 0x11) { // X, C but not Z
		stdlib.console.log("nbcd 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = nbcd(0x0A);
	if (result != 0x90 || (state.sr & 0x15) != 0x11) { // X, C but not Z
		stdlib.console.log("nbcd 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = nbcd(0x0F);
	if (result != 0x8B || (state.sr & 0x15) != 0x11) { // X, C but not Z
		stdlib.console.log("nbcd 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = nbcd(0x10);
	if (result != 0x90 || (state.sr & 0x15) != 0x11) { // X, N, C but not Z
		stdlib.console.log("nbcd 6 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = nbcd(0x1F); // This one is used by HW3Patch as an anti-VTI check, but it does not trip this emulator ;)
	if (result != 0x7B || (state.sr & 0x15) != 0x11) { // X, N, C but not Z
		stdlib.console.log("nbcd 7 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = nbcd(0x11);
	if (result != 0x89 || (state.sr & 0x15) != 0x11) { // X, N, C but not Z
		stdlib.console.log("nbcd 8 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_addx() {
	var result;

	// TODO

	return true;
}

function check_subx() {
	var result;

	// TODO

	return true;
}

function check_muls()
{
	var result;

	state.sr = 0;

	result = muls(0x0, 0x0);
	if (result != 0 || state.sr != 4) {
		stdlib.console.log("muls 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = muls(0x0, 0x1);
	if (result != 0 || state.sr != 4) {
		stdlib.console.log("muls 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = muls(0x1, 0x0);
	if (result != 0 || state.sr != 4) {
		stdlib.console.log("muls 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = muls(0x1, 0x1);
	if (result != 1 || state.sr != 0) {
		stdlib.console.log("muls 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = muls(0x1, 0x10001);
	if (result != 1 || state.sr != 0) {
		stdlib.console.log("muls 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = muls(0x10001, 0x10001);
	if (result != 1 || state.sr != 0) {
		stdlib.console.log("muls 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = muls(0xFFFF, 0xFFFF);
	if (result != 0x00000001 || state.sr != 0) {
		stdlib.console.log("muls 6 " + to_hex(state.sr, 4) + " " + to_hex2(result, 16));
		return false;
	}

	result = muls(0xFFFF, 0x7FFF);
	if (result != 0xFFFF8001 || state.sr != 8) {
		stdlib.console.log("muls 7 " + to_hex(state.sr, 4) + " " + to_hex2(result, 16));
		return false;
	}

	result = muls(0x7FFF, 0x7FFF);
	if (result != 0x3FFF0001 || state.sr != 0) {
		stdlib.console.log("muls 8 " + to_hex(state.sr, 4) + " " + to_hex2(result, 16));
		return false;
	}

	result = muls(0x7FFF, 0xFFFF);
	if (result != 0xFFFF8001 || state.sr != 8) {
		stdlib.console.log("muls 9 " + to_hex(state.sr, 4) + " " + to_hex2(result, 16));
		return false;
	}

	return true;
}

function check_mulu()
{
	var result;

	state.sr = 0;

	result = mulu(0x0, 0x0);
	if (result != 0 || state.sr != 4) {
		stdlib.console.log("mulu 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = mulu(0x0, 0x1);
	if (result != 0 || state.sr != 4) {
		stdlib.console.log("mulu 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = mulu(0x1, 0x0);
	if (result != 0 || state.sr != 4) {
		stdlib.console.log("mulu 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = mulu(0x1, 0x1);
	if (result != 1 || state.sr != 0) {
		stdlib.console.log("mulu 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = mulu(0x1, 0x10001);
	if (result != 1 || state.sr != 0) {
		stdlib.console.log("mulu 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = mulu(0x10001, 0x10001);
	if (result != 1 || state.sr != 0) {
		stdlib.console.log("mulu 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = mulu(0xFFFF, 0xFFFF);
	if (result != 0xFFFE0001 || state.sr != 8) {
		stdlib.console.log("mulu 6 " + to_hex(state.sr, 4) + " " + to_hex2(result, 16));
		return false;
	}

	result = mulu(0xFFFF, 0x7FFF);
	if (result != 0x7FFE8001 || state.sr != 0) {
		stdlib.console.log("mulu 7 " + to_hex(state.sr, 4) + " " + to_hex2(result, 16));
		return false;
	}

	result = mulu(0x7FFF, 0x7FFF);
	if (result != 0x3FFF0001 || state.sr != 0) {
		stdlib.console.log("mulu 8 " + to_hex(state.sr, 4) + " " + to_hex2(result, 16));
		return false;
	}

	result = mulu(0x7FFF, 0xFFFF);
	if (result != 0x7FFE8001 || state.sr != 0) {
		stdlib.console.log("mulu 9 " + to_hex(state.sr, 4) + " " + to_hex2(result, 16));
		return false;
	}

	return true;
}

function check_divu() {
	var result;

	state.sr = 0;
	result = divu(0x10, 0x12345678);
	if (result != 0x12345678 || (state.sr & 3) != 2) { // N undefined when V.
		stdlib.console.log("divu 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divu(0x10, 0xFF000000);
	if (result != 0xFF000000 || (state.sr & 3) != 2) { // N undefined when V.
		stdlib.console.log("divu 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divu(0xCCCCFFFF, 0xFF000000);
	if (result != 0xFF00FF00 || state.sr != 0x8) {
		stdlib.console.log("divu 2 " + to_hex2(result, 9) + " " + to_hex2(0xFF00FF00, 9) + " " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divu(0x1, 0x10000);
	if (result != 0x10000 || (state.sr & 3) != 2) { // N undefined when V.
		stdlib.console.log("divu 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divu(0x10, 0x10000);
	if (result != 0x1000 || state.sr != 0) {
		stdlib.console.log("divu 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divu(0x10001, 0x10);
	if (result != 0x00000010 || state.sr != 0) {
		stdlib.console.log("divu 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divu(0x10100, 0x10);
	if (result != 0x00100000 || state.sr != 4) {
		stdlib.console.log("divu 6 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_divs()
{
	var result;

	state.sr = 0;
	result = divs(0x10, 0x12345678);
	if (result != 0x12345678 || (state.sr & 3) != 2) { // N undefined when V.
		stdlib.console.log("divs 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0x10, 0xFF000000);
	if (result != 0xFF000000 || (state.sr & 3) != 2) { // N undefined when V.
		stdlib.console.log("divs 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0xCCCCFFFF, 0x7F000000);
	if (result != 0x7F000000 || (state.sr & 3) != 2) { // N undefined when V.
		stdlib.console.log("divs 2 " + to_hex2(result, 9) + " " + to_hex2(0x7F000000, 9) + " " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0xCCCCFFFF, 0xFF000000);
	if (result != 0xFF000000 || (state.sr & 3) != 2) {
		stdlib.console.log("divs 3 " + to_hex2(result, 9) + " " + to_hex2(0xFF00FF00, 9) + " " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0xCCCC7FFF, 0x7F000000);
	if (result != 0x7F000000 || (state.sr & 3) != 2) {
		stdlib.console.log("divs 4 " + to_hex2(result, 9) + " " + to_hex2(0xFF00FF00, 9) + " " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0xCCCC7FFF, 0x7E000000);
	if (result != 0x7E000000 || (state.sr & 3) != 2) { // N undefined when V.
		stdlib.console.log("divs 5 " + to_hex2(result, 9) + " " + to_hex2(0x7E000000, 9) + " " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0xCCCC7FFF, 0x3F000000);
	if (result != 0x7E007E00 || state.sr != 0) {
		stdlib.console.log("divs 6 " + to_hex2(result, 9) + " " + to_hex2(0x7E007E00, 9) + " " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0x1, 0x10000);
	if (result != 0x10000 || (state.sr & 3) != 2) {
		stdlib.console.log("divs 7 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0x10, 0x10000);
	if (result != 0x1000 || state.sr != 0) {
		stdlib.console.log("divs 8 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0x10001, 0x10);
	if (result != 0x00000010 || state.sr != 0) {
		stdlib.console.log("divs 9 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = divs(0x10100, 0x10);
	if (result != 0x00100000 || state.sr != 4) {
		stdlib.console.log("divs 10 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_lsl()
{
	var result;

	state.sr = 0;

	result = lsl(0x80000000, 1, 2);
	if (result != 0x00000000 || state.sr != 0x15) {
		stdlib.console.log("lsl 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_asl()
{
	var result;

	state.sr = 0;

	result = asl(0x80000000, 1, 2);
	if (result != 0x00000000 || state.sr != 0x17) {
		stdlib.console.log("asl 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_lsr()
{
	var result;

	// TODO

	return true;
}

function check_asr()
{
	var result;

	// TODO

	return true;
}

function check_ror()
{
	var result;

	// TODO

	return true;
}

function check_rol()
{
	var result;

	state.sr = 0;
	result = rol(0x80000000, 1, 2);
	if (result != 0x00000001 || state.sr != 0x1) {
		stdlib.console.log("rol 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = rol(0x8000, 1, 1);
	if (result != 0x0001 || state.sr != 0x1) {
		stdlib.console.log("rol 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = rol(0x80, 1, 0);
	if (result != 0x01 || state.sr != 0x1) {
		stdlib.console.log("rol 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}

function check_roxr()
{
	var result;

	// TODO

	return true;
}

function check_roxl()
{
	var result;

	state.sr = 0;
	result = roxl(0x80000000, 1, 2);
	if (result != 0x00000000 || state.sr != 0x15) {
		stdlib.console.log("roxl 0 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = roxl(0x80000000, 1, 2);
	if (result != 0x00000001 || state.sr != 0x11) {
		stdlib.console.log("roxl 1 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = roxl(0x8000, 1, 1);
	if (result != 0x0000 || state.sr != 0x15) {
		stdlib.console.log("roxl 2 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = roxl(0x8000, 1, 1);
	if (result != 0x0001 || state.sr != 0x11) {
		stdlib.console.log("roxl 3 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	state.sr = 0;
	result = roxl(0x80, 1, 0);
	if (result != 0x00 || state.sr != 0x15) {
		stdlib.console.log("roxl 4 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	result = roxl(0x80, 1, 0);
	if (result != 0x01 || state.sr != 0x11) {
		stdlib.console.log("roxl 5 " + to_hex(state.sr, 4) + " " + to_hex(result, 16));
		return false;
	}

	return true;
}


function checkemu()
{
	return check_ext()
	    && check_subb()
	    && check_cmpb()
	    && check_addb()
	    && check_subw()
	    && check_cmpw()
	    && check_addw()
	    && check_subl()
	    && check_cmpl()
	    && check_addl()
	    && check_abcd()
	    && check_sbcd()
	    && check_nbcd()
	    && check_addx()
	    && check_subx()
	    && check_muls()
	    && check_mulu()
	    && check_divu()
	    && check_divs()
	    && check_lsl()
	    && check_asl()
	    && check_lsr()
	    && check_asr()
	    && check_ror()
	    && check_rol()
	    && check_roxr()
	    && check_roxl()
	    ;
};

function setRom(newrom) {
	state.rom = newrom;
}

function setReset(newreset) {
	reset = newreset;
}

function setUI(newui) {
	ui = newui;
}

function setLink(newlink) {
	link = newlink;
}

function get_d0() { return state.d0; }
function set_d0(value) { state.d0 = value&4294967295; }
function get_d1() { return state.d1; }
function set_d1(value) { state.d1 = value&4294967295; }
function get_d2() { return state.d2; }
function set_d2(value) { state.d2 = value&4294967295; }
function get_d3() { return state.d3; }
function set_d3(value) { state.d3 = value&4294967295; }
function get_d4() { return state.d4; }
function set_d4(value) { state.d4 = value&4294967295; }
function get_d5() { return state.d5; }
function set_d5(value) { state.d5 = value&4294967295; }
function get_d6() { return state.d6; }
function set_d6(value) { state.d6 = value&4294967295; }
function get_d7() { return state.d7; }
function set_d7(value) { state.d7 = value&4294967295; }

function get_a0() { return state.a0; }
function set_a0(value) { state.a0 = value&4294967295; }
function get_a1() { return state.a1; }
function set_a1(value) { state.a1 = value&4294967295; }
function get_a2() { return state.a2; }
function set_a2(value) { state.a2 = value&4294967295; }
function get_a3() { return state.a3; }
function set_a3(value) { state.a3 = value&4294967295; }
function get_a4() { return state.a4; }
function set_a4(value) { state.a4 = value&4294967295; }
function get_a5() { return state.a5; }
function set_a5(value) { state.a5 = value&4294967295; }
function get_a6() { return state.a6; }
function set_a6(value) { state.a6 = value&4294967295; }
function get_a7() { return state.a7; }
function set_a7(value) { state.a7 = value&4294967295; }
function get_a8() { return state.a8; }
function set_a8(value) { state.a8 = value&4294967295; }

function get_sr() { return state.sr; }
function set_sr(value) { state.sr = value&65535; }
function get_pc() { return state.pc; }
function set_pc(value) { state.pc = value&4294967295; }

function get_rom() { return state.rom; }
function get_ram() { return state.ram; }
function get_t() { return cpu.t; }
function get_n() { return cpu.n; }
function get_cycles() { return cpu.cycles; }

function get_rb() { return rb; }
function get_rw() { return rw; }
function get_rl() { return rl; }
function get_wb() { return wb; }
function get_ww() { return ww; }
function get_wl() { return wl; }

function get_rb_1_normal() { return rb_1_normal; }
function get_rb_1_flashspecial() { return rb_1_flashspecial; }
function get_rw_1_normal() { return rw_1_normal; }
function get_rw_1_flashspecial() { return rw_1_flashspecial; }
function get_wb_1_normal() { return wb_1_normal; }
function get_ww_1_normal() { return ww_1_normal; }
function get_ww_1_flashspecial() { return ww_1_flashspecial; }

function get_rb_3_normal() { return rb_3_normal; }
function get_rb_3_flashspecial() { return rb_3_flashspecial; }
function get_rw_3_normal() { return rw_3_normal; }
function get_rw_3_flashspecial() { return rw_3_flashspecial; }
function get_wb_3_normal() { return wb_3_normal; }
function get_ww_3_normal() { return ww_3_normal; }
function get_ww_3_flashspecial() { return ww_3_flashspecial; }

function get_rb_8_normal() { return rb_8_normal; }
function get_rb_8_flashspecial() { return rb_8_flashspecial; }
function get_rw_8_normal() { return rw_8_normal; }
function get_rw_8_flashspecial() { return rw_8_flashspecial; }
function get_wb_8_normal() { return wb_8_normal; }
function get_ww_8_normal() { return ww_8_normal; }
function get_ww_8_flashspecial() { return ww_8_flashspecial; }

function get_rb_9_normal() { return rb_9_normal; }
function get_rb_9_flashspecial() { return rb_9_flashspecial; }
function get_rw_9_normal() { return rw_9_normal; }
function get_rw_9_flashspecial() { return rw_9_flashspecial; }
function get_wb_9_normal() { return wb_9_normal; }
function get_ww_9_normal() { return ww_9_normal; }
function get_ww_9_flashspecial() { return ww_9_flashspecial; }

function get_newfileready() { return newfileready; }
function setNewfileready(newnewfileready) { newfileready = newnewfileready; }
function get_newflashfileready() { return newflashfileready; }
function setNewflashfileready(newnewflashfileready) { newflashfileready = newnewflashfileready; }

function set_erase_ram_upon_reset(value) { state.erase_ram_upon_reset = value; }

function get_stopped() { return state.stopped; }
function get_hardware_model() { return state.hardware_model; }
function get_calculator_model() { return state.calculator_model; }
function get_jmp_tbl() { return state.jmp_tbl; }
function get_ROM_base() { return state.ROM_base; }
function get_FlashMemorySize() { return state.FlashMemorySize; }

function pause_emulator()
{
	// Prevent emu_main_loop frop running next time.
	//stdlib.clearInterval(main_interval_timer_id);
}

function increase_emulator_speed()
{
	if (state.main_interval_timer_interval > 1) {
		state.main_interval_timer_interval--;
		stdlib.console.log("Setting main timer interval to " + state.main_interval_timer_interval + " ms.");
		stdlib.clearInterval(main_interval_timer_id);
		main_interval_timer_id = stdlib.setInterval(emu_main_loop, state.main_interval_timer_interval);
	}
}

function decrease_emulator_speed()
{
	state.main_interval_timer_interval++;
	stdlib.console.log("Setting main timer interval to " + state.main_interval_timer_interval + " ms.");
	stdlib.clearInterval(main_interval_timer_id);
	main_interval_timer_id = stdlib.setInterval(emu_main_loop, state.main_interval_timer_interval);
}

function resume_emulator()
{
	// Is that enough ?
	main_interval_timer_id = stdlib.setInterval(emu_main_loop, state.main_interval_timer_interval);
}

function toggle_framesync()
{
	state.port_70001D ^= 0x80;
}

function apiversion()
{
	return 1;
}

return {
	// Functions called directly from events on elements in the HTML page
	apiversion : apiversion,
	initemu : initemu,
	initialize_calculator : initialize_calculator,

	// Getter and setter functions called by a script in the HTML page, for defining stuff loaded from other files.
	newfileready : get_newfileready,
	setNewfileready : setNewfileready,
	newflashfileready : get_newflashfileready,
	setNewflashfileready : setNewflashfileready,
	setRom : setRom,
	setReset : setReset,
	setUI : setUI,
	setLink : setLink,

	// Setter functions called by the UI.
	loadrom : loadrom,
	setKey : setKey,
	setONKeyPressed : setONKeyPressed,
	setONKeyReleased : setONKeyReleased,
	pause_emulator : pause_emulator,
	resume_emulator : resume_emulator,
	set_erase_ram_upon_reset : set_erase_ram_upon_reset,
	increase_emulator_speed : increase_emulator_speed,
	decrease_emulator_speed : decrease_emulator_speed,

	// Trigger function called by linking code.
	raise_interrupt : raise_interrupt,
	fire_cpu_exception : fire_cpu_exception,

	// Debugging, getter functions for internal variables
	emu_main_loop : emu_main_loop,
	to_hex : to_hex,
	to_hex2 : to_hex2,
	memory_dump : memory_dump, 
	print_status : print_status,
	print_status2 : print_status2,
	disassemble : disassemble,
	ROM_CALL : ROM_CALL,
	HeapDeref : HeapDeref,
	HeapSize : HeapSize,
	PrintHeap : PrintHeap,

	d0 : get_d0, d1 : get_d1, d2 : get_d2, d3 : get_d3, d4 : get_d4, d5 : get_d5, d6 : get_d6, d7 : get_d7,
	a0 : get_a0, a1 : get_a1, a2 : get_a2, a3 : get_a3, a4 : get_a4, a5 : get_a5, a6 : get_a6, a7 : get_a7, a8 : get_a8,
	sr : get_sr, pc : get_pc,
	dn : dn, an : an,

	set_d0 : set_d0, set_d1 : set_d1, set_d2 : set_d2, set_d3 : set_d3, set_d4 : set_d4, set_d5 : set_d5, set_d6 : set_d6, set_d7 : set_d7,
	set_a0 : set_a0, set_a1 : set_a1, set_a2 : set_a2, set_a3 : set_a3, set_a4 : set_a4, set_a5 : set_a5, set_a6 : set_a6, set_a7 : set_a7, set_a8 : set_a8,
	set_sr : set_sr, set_pc : set_pc,

	rom : get_rom,
	ram : get_ram,
	t : get_t,
	n : get_n,
	cycles : get_cycles,

	rb : get_rb,
	rw : get_rw,
	rl : get_rl,
	wb : get_wb,
	ww : get_ww,
	wl : get_wl,

	rb_1_normal : get_rb_1_normal,
	rb_1_flashspecial : get_rb_1_flashspecial,
	rw_1_normal : get_rw_1_normal,
	rw_1_flashspecial : get_rw_1_flashspecial,
	wb_1_normal : get_wb_1_normal,
	ww_1_normal : get_ww_1_normal,
	ww_1_flashspecial : get_ww_1_flashspecial,

	rb_3_normal : get_rb_3_normal,
	rb_3_flashspecial : get_rb_3_flashspecial,
	rw_3_normal : get_rw_3_normal,
	rw_3_flashspecial : get_rw_3_flashspecial,
	wb_3_normal : get_wb_3_normal,
	ww_3_normal : get_ww_3_normal,
	ww_3_flashspecial : get_ww_3_flashspecial,

	rb_8_normal : get_rb_8_normal,
	rb_8_flashspecial : get_rb_8_flashspecial,
	rw_8_normal : get_rw_8_normal,
	rw_8_flashspecial : get_rw_8_flashspecial,
	wb_8_normal : get_wb_8_normal,
	ww_8_normal : get_ww_8_normal,
	ww_8_flashspecial : get_ww_8_flashspecial,

	rb_9_normal : get_rb_9_normal,
	rb_9_flashspecial : get_rb_9_flashspecial,
	rw_9_normal : get_rw_9_normal,
	rw_9_flashspecial : get_rw_9_flashspecial,
	wb_9_normal : get_wb_9_normal,
	ww_9_normal : get_ww_9_normal,
	ww_9_flashspecial : get_ww_9_flashspecial,

	stopped : get_stopped,
	hardware_model : get_hardware_model,
	calculator_model : get_calculator_model,
	jmp_tbl : get_jmp_tbl,
	ROM_base : get_ROM_base,
	FlashMemorySize : get_FlashMemorySize,

	toggle_framesync : toggle_framesync,

	_save_state : _save_state,
	_restore_state : _restore_state

};

}

function TI68kEmulatorLinkModule(stdlib) {

var emu = false;
var ui = false;
var calculator_model = 1;
var link_incoming_queue = new Array();
var link_outgoing_queue = new Array();
var link_config = 1; // 0x60000C
var transmit_finished = false; // deduced from 0x60000C
var reset_upon_ack_with_len = true;

var link_recv_varsize = 0;
var link_recv_vartype = 0;
var link_recv_varname = "";
var link_recv_foldername = "";
var link_recv_data = new Array();
var link_recv_mode = 0;
var link_dirlist_vars = new Array();
var link_dirlist_folders = new Array();
var link_dirlist_apps = new Array();
var link_dirlist_curidx = 0;

var link_pending_keys = new Array();
var link_interval_timer_id = 0;

// -------------------- Variables above this line should be saved and restored --------------------

function _save_state()
{
	var emustate = new Object();
	return emustate;
}

function _restore_state(linkstate)
{
	if (typeof(linkstate) === "object") {
		stdlib.clearInterval(link_interval_timer_id);
		// TODO
	}
	else {
		stdlib.console.log("Refusing to restore state from something not an object / from an object without the expected sub-objects");
	}
}

function setUI(newui)
{
	ui = newui;
}

function setEmu(newemu)
{
	emu = newemu;
}

function setCalculatorModel(model)
{
	calculator_model = model;
}

function compute_link_status()
{
	var status = 0;
	if (link_incoming_queue.length > 0 && typeof(link_incoming_queue[0]) == "number") {
		status |= 0x32; // Set SRX (byte in receive buffer) and SLI (interrupt pending).
	}
	else if (link_config & 2) { // Transmit buffer empty.
		status |= 0x50; // Set STX (transmit buffer empty) and SLI (interrupt pending).
	}
	// NOTE: SLE (error) never set by this implementation.
	//stdlib.console.log("read link status: " + to_hex(status, 2));
	return status;
}

function read_byte()
{
	if (link_incoming_queue.length > 0 && typeof(link_incoming_queue[0]) == "number")
	{
		//stdlib.console.log("reading link buffer: " + to_hex(link_incoming_queue[0], 2));
		return link_incoming_queue.shift();
	}
	else
	{
		//stdlib.console.log("tried to read link buffer, returned 0 because no data");
		return 0;
	}
}

function write_byte(value)
{
	link_outgoing_queue.push(value);
	//stdlib.console.log("writing to link buffer: " + to_hex(value, 2));
	transmit_finished = true;
}

function reset_arrays()
{
	link_incoming_queue = new Array();
	link_outgoing_queue = new Array();
}

function dump_incoming_queue(header)
{
	var dump = header;
	for (var y = 0; y < link_incoming_queue.length; y++)
	{
		if (typeof(link_incoming_queue[y]) == "number") {
			dump += emu.to_hex(link_incoming_queue[y], 2) + " ";
		}
		else {
			dump += link_incoming_queue[y] + " ";
		}
	}
	stdlib.console.log(dump);
}

function dump_outgoing_queue(header)
{
	var dump = header;
	for (var y = 0; y < link_outgoing_queue.length; y++)
	{
		if (typeof(link_outgoing_queue[y]) == "number") {
			dump += emu.to_hex(link_outgoing_queue[y], 2) + " ";
		}
		else {
			dump += link_outgoing_queue[y] + " ";
		}
	}
	stdlib.console.log(dump);
}

function ti89_send_ACK()
{
	//                PC_TI92p  CMD_ACK
	link_incoming_queue.push(8, 0x56, 0, 0);
}

function ti89_recv_ACK()
{
	link_incoming_queue.push('WAIT_ACK');
}

function ti89_send_CTS()
{
	//                PC_TI92p  CMD_CTS
	link_incoming_queue.push(8, 0x09, 0, 0); // CTS packet
}

function ti89_recv_CTS()
{
	link_incoming_queue.push('WAIT_CTS');
}

function ti89_send_CNT()
{
	//                PC_TI92p  CMD_CNT
	link_incoming_queue.push(8, 0x78, 0, 0);
}

function ti89_recv_CNT()
{
	link_incoming_queue.push('WAIT_CNT');
}

function ti89_send_EOT()
{
	//                PC_TI92p  CMD_EOT
	link_incoming_queue.push(8, 0x92, 0, 0);
}

function ti89_send_KEY(keycode)
{
	//                PC_TI92p  CMD_KEY
	link_incoming_queue.push(8, 0x87); // key header
	link_incoming_queue.push(keycode & 0xFF); // key code, little endian
	link_incoming_queue.push((keycode >>> 8) & 0xFF);
}

function ti89_send_XDP(data_section_len, chunk_len, buf, offset, write_both_checksum_and_length)
{
	//                PC_TI92p  CMD_XDP
	link_incoming_queue.push(8, 0x15);

	var data_checksum = 0;

	link_incoming_queue.push(data_section_len % 256, data_section_len >>> 8); // length, little endian to calc
	if (write_both_checksum_and_length) {
		link_incoming_queue.push(0, 0, 0, 0);
		link_incoming_queue.push((chunk_len >>> 8) & 0xFF, chunk_len % 256);
		data_checksum = (chunk_len % 256) + ((chunk_len >>> 8) & 0xFF);
	}

	for (var x = offset; x < offset + chunk_len; x++)
	{
		link_incoming_queue.push(buf[x]);
		data_checksum += buf[x];
	}
	link_incoming_queue.push(data_checksum % 256, (data_checksum >>> 8) % 256); // data checksum, little endian to calc
}

function ti89_recv_XDP()
{
	link_incoming_queue.push('WAIT_XDP');
}

function ti89_recv_VAR()
{
	link_incoming_queue.push('WAIT_VAR');
}

function ti89_send_REQ(length, varname, vartype)
{
	// libticalcs: dbus_send (target + cmd), called by ti89_send_REQ.
	//                PC_TI92p  CMD_REQ
	link_incoming_queue.push(8, 0xA2); // standard variable header

	// If varname is a string, let's convert it into an array of numbers.
	if (typeof(varname) == "string") {
		var bytes = new Array();
		for (var i = 0; i < varname.length; ++i) {
			bytes.push(varname.charCodeAt(i) & 0xFF);
		}
		varname = bytes;
	}

	var header_len = varname.length + 6;
	if (vartype == 0x18) { // TI89_CLK
		header_len++;
	}

	// libticalcs: dbus_send (length).
	link_incoming_queue.push(header_len, 0); // header length, little endian to calc
	// libticalcs: ti89_send_REQ.
	link_incoming_queue.push(length % 256, (length >>> 8) & 0xFF, (length >>> 16) & 0xFF, (length >>> 24) & 0xFF);
	link_incoming_queue.push(vartype); // variable type
	link_incoming_queue.push(varname.length);

	// libticalcs: dbus_send (checksum computation) on the sole data after the 4 first bytes.
	var header_checksum = varname.length + vartype + (length % 256) + ((length >>> 8) & 0xFF) + ((length >>> 16) & 0xFF) + ((length >>> 24) & 0xFF);
	for (var x = 0; x < varname.length; x++)
	{
		link_incoming_queue.push(varname[x]);
		header_checksum += varname[x];
	}

	// libticalcs: dbus_send (sum).
	link_incoming_queue.push(header_checksum % 256, header_checksum >>> 8); // header checksum, little endian to calc
}

function ti89_send_RTS(length, varname, vartype)
{
	// libticalcs: dbus_send (target + cmd), called by ti89_send_RTS.
	//                PC_TI92p  CMD_RTS
	link_incoming_queue.push(8, 0xC9); // standard variable header

	var header_len = varname.length + 6 + 1;

	// libticalcs: dbus_send (length).
	link_incoming_queue.push(header_len, 0); // header length, little endian to calc
	// libticalcs: ti89_send_RTS.
	link_incoming_queue.push(length % 256, (length >>> 8) & 0xFF, (length >>> 16) & 0xFF, (length >>> 24) & 0xFF); // data length, little endian to calc
	link_incoming_queue.push(vartype); // variable type
	link_incoming_queue.push(varname.length);

	// libticalcs: dbus_send (checksum computation) on the sole data after the 4 first bytes.
	var header_checksum = varname.length + vartype + (length % 256) + ((length >>> 8) & 0xFF) + ((length >>> 16) & 0xFF) + ((length >>> 24) & 0xFF);
	for (var x = 0; x < varname.length; x++)
	{
		link_incoming_queue.push(varname[x]);
		header_checksum += varname[x];
	}
	link_incoming_queue.push(0);

	// libticalcs: dbus_send (sum).
	link_incoming_queue.push(header_checksum % 256, header_checksum >>> 8); // header checksum, little endian to calc
}

function sendfile(varname, vartype, buf, data_len, offset, write_both_checksum_and_length)
{
	// Initial RTS.
	var data_len_full = data_len;
	if (write_both_checksum_and_length) {
		data_len_full += 2;
	}
	ti89_send_RTS(data_len_full, varname, vartype);

	// Loop until all chunks have been queued.
	do {
		var chunk_len = Math.min(65536, data_len);

		ti89_recv_ACK();

		ti89_recv_CTS();
		ti89_send_ACK(); // for calc's CTS

		var data_section_len = chunk_len;
		if (write_both_checksum_and_length) {
			data_section_len += 6; // 4 length bytes + 2 checksum bytes
		}

		ti89_send_XDP(data_section_len, chunk_len, buf, offset, write_both_checksum_and_length);
		ti89_recv_ACK();

		if (chunk_len == 65536) {
			ti89_send_CNT();
			offset += 65536;
			data_len -= 65536;
		}
		else {
			ti89_send_EOT();
		}

	} while (chunk_len != data_len);

	// Wait for final ACK.
	ti89_recv_ACK();

	stdlib.console.log("finished processing for sending variable");

	dump_incoming_queue("Incoming: " + link_incoming_queue.length + " (pseudo-)bytes\n");
}

function sendkey(keycode)
{
	// Initial KEY.
	ti89_send_KEY(keycode);

	// Wait for final ACK.
	ti89_recv_ACK();

	stdlib.console.log("finished processing for sending key");

	dump_incoming_queue("Incoming: " + link_incoming_queue.length + " (pseudo-)bytes\n");
}

function send_next_key() {
    if (link_pending_keys.length == 0) {
        stdlib.clearInterval(link_interval_timer_id);
    }
    sendkey(link_pending_keys.shift());
}

function sendkeys(keyarray)
{
	var newarray = new Array();
	while (keyarray.length > 0) {
		console.log("length is " + keyarray.length);
		var item = keyarray.shift();
		if (typeof(item) == 'number') {
			console.log("found number " + item);
			// Push numbers as is.
			newarray.push(item);
		}
		else if (typeof(item) == 'string') {
			console.log("found string " + item);
			// Push each character of the string.
			for (var i = 0; i < item.length; i++) {
				newarray.push(item.charCodeAt(i));
			}
		}
	}
	link_pending_keys = newarray;
	link_interval_timer_id = stdlib.setInterval(send_next_key, 200);
}

var MODE_RECVFILE = 0;
var MODE_RECVFILE_NS = 1;
var MODE_DIRLIST_ROOT = 2;
var MODE_DIRLIST_FOLDER = 3;

// This code was moved out to an external function, so that it can be called multiple times, in order to retrigger reception of one chunk.
function recvfile_requestchunk()
{
	ti89_send_ACK(); // for calc's VAR

	ti89_send_CTS();
	ti89_recv_ACK();

	ti89_recv_XDP();
	ti89_send_ACK(); // for calc's XDP

	// If EOT is received instead of CNT, we have reached the end of the transfer.
	ti89_recv_CNT();
}

// For vartype, see http://debrouxl.github.io/gcc4ti/link.html#LIO_CTX and libtifiles:types89.c.
function recvfile(varname, vartype)
{
	link_reset_recv_vars();

	// Initial REQ.
	ti89_send_REQ(0, varname, vartype);
	ti89_recv_ACK();

	// Just delegate the rest to the non-silent receive function.
	link_recv_mode = MODE_RECVFILE;
	_recvfile_ns();
}

function recvfile_ns()
{
	link_reset_recv_vars();

	link_recv_mode = MODE_RECVFILE_NS;
	_recvfile_ns();
}

function dirlist()
{
	link_reset_recv_vars();
	link_reset_dirlist_vars();

	// Initial REQ.
	//       TI89_FDIR << 24      TI89_RDIR 
	ti89_send_REQ(0x1F000000, "", 0x1A);
	ti89_recv_ACK();

	// Delegate the rest of the root folder enumeration to the non-silent receive function.
	link_recv_mode = MODE_DIRLIST_ROOT;
	_recvfile_ns();

	// TODO:
	// 1) parse result, in link_handling() or a helper function;
	// 2) build an array of objects (object of objects ?), one object per folder;
	// 3) call dirlist_folder in a loop.
}

function dirlist_folder(foldername)
{
	// Initial REQ.
	//       TI89_LDIR << 24              TI89_RDIR 
	ti89_send_REQ(0x1B000000, foldername, 0x1A);
	ti89_recv_ACK();

	// Delegate the rest of the <foldername> enumeration to the non-silent receive function.
	link_recv_mode = MODE_DIRLIST_FOLDER;
	_recvfile_ns();

	// TODO:
	// 1) parse result, in link_handling() or a helper function;
	// 2) add objects (containing name, size, type, state) corresponding to this folder's files into the array of objects / object of objects.
}

function _recvfile_ns()
{
	ti89_recv_VAR();

	// At first, this code was written as do { [the contents of recvfile_requestchunk()] } while (link_recv_loop_again); [push final ACK]
	// However, recvfile_requestchunk() finished long before the emulated calculator had a chance to send data, and as a consequence,
	// long before the linking emulation code had a chance to set link_recv_loop_again to true.
	// The only thing we can do is queue transfer for the first chunk, and when we have received it:
	// * if the calculator sends a CNT packet, queue transfer for the next chunk;
	// * if the calculator sends an EOT packet, send final ACK.
	recvfile_requestchunk();

	stdlib.console.log("finished processing for receiving variable / dirlist (first chunk)");

	dump_incoming_queue("Incoming: " + link_incoming_queue.length + " (pseudo-)bytes\n");
}

function link_reset_recv_vars()
{
	link_recv_varsize = 0;
	link_recv_vartype = 0
	link_recv_varname = "";
	link_recv_foldername = "";
	link_recv_data = new Array();
}

function link_reset_dirlist_vars()
{
	link_dirlist_vars = new Array();
	link_dirlist_folders = new Array();
	link_dirlist_apps = new Array();
	link_dirlist_curidx = 0;
}

function link_reset_state(packettype)
{
	stdlib.console.log("Receiving " + packettype + " failed, resetting link state !");
	link_incoming_queue = new Array();
	link_outgoing_queue = new Array();
	link_reset_recv_vars();
	link_reset_dirlist_vars();

	emu.raise_interrupt(6); // AUTO_INT_6
}

// For vartype, see http://debrouxl.github.io/gcc4ti/link.html#LIO_CTX and libtifiles:types89.c.
function link_magic_number()
{
	if (link_recv_vartype >= 35) return "**TIFL**"; // (OS) FlashApp (Certificate)

	if (calculator_model == 1 || calculator_model == 9) return "**TI89**";
	else return "**TI92P*";
}

// Simplified version of libtifiles: ti9x_file_write_regular.
function link_build_output_file()
{
	/*var dump = "";
	for (var y = 0; y < link_recv_data.length; y++)
	{
		dump += to_hex(link_recv_data[y], 2) + " ";
	}
	stdlib.console.log(dump);*/

	// 1) Magic number (8 bytes)
	var output_file = new Array();
	var magic = link_magic_number();
	for (var i = 0; i < magic.length; i++) {
		output_file.push(magic.charCodeAt(i));
	}

	// 2) 2 additional bytes (maybe file format revision, but TI never used more than one ?).
	output_file.push(0x01);
	output_file.push(0x00);

	// 3) Folder name, if any (up to 8 chars)
	link_recv_foldername = "main";
	var separatoroffset = link_recv_varname.indexOf("\\");

	if (separatoroffset != -1) {
		link_recv_foldername = link_recv_varname.substr(0, Math.min(separatoroffset, 8-1));
		link_recv_varname = link_recv_varname.substr(separatoroffset + 1);
		if (link_recv_varname.length > 8) {
			stdlib.console.log("Invalid varname, clamping to 8 characters");
			link_recv_varname = link_recv_varname.substr(0, 7);
		}
	}
	for (var i = 0; i < link_recv_foldername.length; i++) {
		output_file.push(link_recv_foldername.charCodeAt(i));
	}
	// Pad to 8 chars with 0x00.
	for (var i = 8 - link_recv_foldername.length; i > 0; i--) {
		output_file.push(0);
	}

	// 4) 40 x 0x00.
	for (var i = 0; i < 40; i++) {
		output_file.push(0);
	}

	// 5) A single entry in this file.
	output_file.push(0x01);
	output_file.push(0x00);

	// 6) Offset of data in file (can be hard-coded to 0x52 in this case).
	output_file.push(0x52);
	output_file.push(0x00);
	output_file.push(0x00);
	output_file.push(0x00);

	// 7) Variable name
	for (var i = 0; i < link_recv_varname.length; i++) {
		output_file.push(link_recv_varname.charCodeAt(i));
	}
	// Pad to 8 chars with 0x00.
	for (var i = 8 - link_recv_varname.length; i > 0; i--) {
		output_file.push(0);
	}

	// 8) Variable type
	output_file.push(link_recv_vartype);

	// 9) Variable attribute (archived and friends)
	// Hard-code unarchived and unlocked, as the variable attribute information is not available in the packet sequence (we'd need to implement dirlist for that).
	output_file.push(0x00);

	// 10) 2 x 0x00
	output_file.push(0x00);
	output_file.push(0x00);

	// 11) Total size of file on the computer side (including checksum)
	var varsize = link_recv_varsize + 0x52 + 4 + 2;
	output_file.push(varsize & 0xFF);
	output_file.push((varsize >>> 8) & 0xFF);
	output_file.push((varsize >>> 16) & 0xFF);
	output_file.push((varsize >>> 24) & 0xFF);

	// 12) Marker
	output_file.push(0xA5);
	output_file.push(0x5A);

	// 13) 4 x 0x00
	output_file.push(0x00);
	output_file.push(0x00);
	output_file.push(0x00);
	output_file.push(0x00);

	// 14) Data (at last :P)
	var checksum = 0;
	for (var i = 0; i < link_recv_data.length; i++) {
		output_file.push(link_recv_data[i]);
		checksum += link_recv_data[i];
	}

	// 15) Checksum
	output_file.push(checksum & 0xFF);
	output_file.push((checksum >>> 8) & 0xFF);

	// Finally, replace file data.
	link_recv_data = new Uint8Array(output_file);
}

function process_recv_XDP(x)
{
	// TODO: error handling
	var length = link_outgoing_queue[x+2] + link_outgoing_queue[x+3] * 256;
	dump_outgoing_queue("WAIT_XDP Before: ");

	// Process contents of VAR packet, now that it was received entirely (libticalcs: ti89_recv_VAR).
	var computed_checksum = link_outgoing_queue[0] + link_outgoing_queue[1] + link_outgoing_queue[2] + link_outgoing_queue[3]; // varsize
	link_recv_varsize = link_outgoing_queue[0] + link_outgoing_queue[1] * 256 + link_outgoing_queue[2] * 65536 + link_outgoing_queue[3] * 16777216;
	link_recv_vartype = link_outgoing_queue[4];
	computed_checksum += link_outgoing_queue[4] + link_outgoing_queue[5]; // vartype + strl
	var strl = link_outgoing_queue[5];
	for (var i = 0; i < strl; i++) {
		// Don't append to link_recv_varname if we're not receiving a file.
		if (link_recv_mode < MODE_DIRLIST_ROOT) {
			link_recv_varname += String.fromCharCode(link_outgoing_queue[6+i]);
		}
		computed_checksum += link_outgoing_queue[6+i];
	}
	stdlib.console.log("link_recv_varsize = " + link_recv_varsize);
	stdlib.console.log("link_recv_vartype = " + link_recv_vartype);
	stdlib.console.log("strl = " + strl);
	stdlib.console.log("link_recv_varname = " + link_recv_varname);

	// Strip high-order bits in varsize to prevent memory consumption explosion.
	link_recv_data = new Uint8Array(link_recv_varsize & 0xFFFF);
	var packet_checksum = link_outgoing_queue[x-2] + link_outgoing_queue[x-1] * 256;
	if ((computed_checksum & 0xFFFF) != packet_checksum) {
		stdlib.console.log("WAIT_XDP: Wrong checksum: computed=" + emu.to_hex(computed_checksum, 4) + " packet=" + emu.to_hex(packet_checksum, 4) + "!");
	}

	// Skip what we processed.
	link_outgoing_queue.splice(0, x+4);
	link_incoming_queue.shift();
	stdlib.console.log("Eaten an item in WAIT_XDP", x);

	dump_outgoing_queue("After: ");
}

function process_recv_CNTEOT(x)
{
	// TODO: error handling
	dump_outgoing_queue("WAIT_CNT Before: ");
	var packet_type = link_outgoing_queue[x+1];

	// Process contents of XDP packet, now that it was received entirely (libticalcs: ti89_recv_XDP + clients): build output file.
	// Skip 4 first bytes.
	var computed_checksum = 0;
	// Strip high-order bits in varsize to prevent memory consumption explosion.
	for (var i = 4; i < (link_recv_varsize & 0xFFFF) + 4; i++) {
		link_recv_data[i-4] = link_outgoing_queue[i];
		computed_checksum += link_outgoing_queue[i];
	}

	var packet_checksum = link_outgoing_queue[x-2] + link_outgoing_queue[x-1] * 256;
	if ((computed_checksum & 0xFFFF) != packet_checksum) {
		stdlib.console.log("WAIT_CNT: Wrong checksum: computed=" + emu.to_hex(computed_checksum, 4) + " packet=" + emu.to_hex(packet_checksum, 4) + "!");
	}

	stdlib.console.log("link_recv_data has length " + link_recv_data.length);

	link_outgoing_queue.splice(0, x+4);
	link_incoming_queue.shift();
	stdlib.console.log("Eaten an item in WAIT_CNT", x);

	if (link_recv_mode < MODE_DIRLIST_ROOT) {
		if (packet_type == 0x92) {
			// EOT, we'll be able to create the target file.

			// Push final ACK, so that transfer terminates on the calculator side.
			ti89_send_ACK(); // for calc's XDP;

			// Create the target file.
			link_build_output_file();
		}
		else {
			recvfile_requestchunk(); // CNT, queue transfers for next chunk.
		}
	}
	else {
		var extra = (calculator_model == 8) ? 8: 0;

		if (link_recv_mode == MODE_DIRLIST_ROOT) {
			//stdlib.console.log("Parsing root folder");
			link_dirlist_vars = new Array();
			link_dirlist_folders = new Array();
			link_dirlist_apps = new Array();
			link_dirlist_curidx = 0;

			// Build folder list from data in root folder enumeration.
			var i = 0;
			while (i < link_recv_data.length) {
				var name = "";
				// link_recv_data instanceof Uint8Array, so we can't use Array.slice() and Array.join(), and Uint8Array.subarray() returns Uint8Array.
				for (var j = 0; j < 8; j++) {
					if (link_recv_data[i + j] != 0) {
						name += String.fromCharCode(link_recv_data[i + j]);
					}
					else {
						break;
					}
				}
				var type = link_recv_data[i + 8];
				var attr = link_recv_data[i + 9];
				var size = link_recv_data[i + 10] + (link_recv_data[i + 11] * 256) + (link_recv_data[i + 12] * 65536);
				stdlib.console.log("i=" + i + "\tname=" + name + "\ttype=" + type + "\tattr=" + attr + "\tsize=" + size);
				if (type == 0x1F) { // TI89_DIR
					// Record folder name.
					link_dirlist_folders.push(name);
				}
				i += 14 + extra;
			}

			// Trigger next step: enumeration of the first folder. There should always be "main" anyway.
			if (link_dirlist_folders.length > 0) {
				// Push final ACK.
				ti89_send_ACK(); // for calc's EOT.

				dirlist_folder(link_dirlist_folders[link_dirlist_curidx]);
			}
		}
		else if (link_recv_mode == MODE_DIRLIST_FOLDER) {
			stdlib.console.log("Parsing folder\"" + link_dirlist_folders[link_dirlist_curidx] + "\"");

			// Add to the array of entries from data in current folder enumeration.
			var i = 14 + extra; // Skip redundant entry describing folder itself.
			while (i < link_recv_data.length) {
				var name = "";
				// link_recv_data instanceof Uint8Array, so we can't use Array.slice() and Array.join(), and Uint8Array.subarray() returns Uint8Array.
				for (var j = 0; j < 8; j++) {
					if (link_recv_data[i + j] != 0) {
						name += String.fromCharCode(link_recv_data[i + j]);
					}
					else {
						break;
					}
				}
				var type = link_recv_data[i + 8];
				var attr = link_recv_data[i + 9];
				var size = link_recv_data[i + 10] + (link_recv_data[i + 11] * 256) + (link_recv_data[i + 12] * 65536);
				stdlib.console.log("i=" + i + "\tname=" + name + "\ttype=" + type + "\tattr=" + attr + "\tsize=" + size);
				if (type == 0x24) { // TI89_APPL
					var j = 0;
					var k = -1;

					while (j < link_dirlist_apps.length) {
						if (link_dirlist_apps[j].name == name) {
							k = j;
							break;
						}
						j++;
					}
					if (k == -1) {
						// App not found, add it.
						var app = new Object();
						app.name = name;
						app.type = type; // Not really interesting for an app (always 0x24).
						app.attr = attr; // Not really interesting for an app (always 0).
						app.size = size;
						link_dirlist_apps.push(app);
					}
				}
				else {
					// Skip regeq and regcoef in main.
					if (   (link_dirlist_folders[link_dirlist_curidx] != "main")
					    || (name != "regeq" && name != "regcoef")) {
						// Record entry.
						var newvar = new Object();
						newvar.name = link_dirlist_folders[link_dirlist_curidx] + "\\" + name;
						newvar.type = type;
						newvar.attr = attr;
						newvar.size = size;
						link_dirlist_vars.push(newvar);
					}
				}
				i += 14 + extra;
			}

			// Trigger next step: enumeration of the next folder, if any.
			link_dirlist_curidx++;
			if (link_dirlist_curidx < link_dirlist_folders.length) {
				// Push final ACK.
				ti89_send_ACK(); // for calc's EOT.

				dirlist_folder(link_dirlist_folders[link_dirlist_curidx]);
			}
		}
	}

	dump_outgoing_queue("After: ");
}

// Extracted out of main_loop to help profiling.
function link_handling()
{
	var link_status = compute_link_status();
	if ((link_config & 0x40) == 0) // LD (disable byte sender/receiver) clear
	{
		// Error (bit 3) never set, not checking for it.
		if (((link_config & 5) && link_incoming_queue.length > 0 && typeof(link_incoming_queue[0]) == "number") ||
			((link_config & 6) == 6))
		{
			emu.raise_interrupt(4); // AUTO_INT_4
		}
	}

	if (link_incoming_queue.length > 0)
	{
		if (link_incoming_queue[0] == 'WAIT_ACK')
		{
			//stdlib.console.log("Begin WAIT_ACK, outgoing queue length:", link_outgoing_queue.length);
			for (var x = 0; x + 4 <= link_outgoing_queue.length; x++)
			{
				//                                TI92p_PC / V200_PC                  CMD_ACK
				if (   (link_outgoing_queue[x] == 0x88 && link_outgoing_queue[x+1] == 0x56)
				//                                TI89_PC / TI89t_PC                  CMD_ACK
				    || (link_outgoing_queue[x] == 0x98 && link_outgoing_queue[x+1] == 0x56))
				{
					// libticalcs: ti89_recv_ACK indicates that length can be nonzero for failure
					// FIXME: better error handling !
					if (   /*reset_upon_ack_with_len
					    &&*/ (link_outgoing_queue[x+2] != 0 || link_outgoing_queue[x+3] != 0)) {
						//stdlib.console.log(emu.to_hex(link_outgoing_queue[x+2], 2) + " " + emu.to_hex(link_outgoing_queue[x+3], 2));
						link_reset_state("ACK");
					}
					else {
						dump_outgoing_queue("WAIT_ACK Before: ");

						link_outgoing_queue.splice(x, x+4);
						link_incoming_queue.shift();
						stdlib.console.log("Eaten an item in WAIT_ACK", x);

						dump_outgoing_queue("After: ");
					}
				}
			}
			//stdlib.console.log("End WAIT_ACK, outgoing queue length:", link_outgoing_queue.length);
		}
		else if (link_incoming_queue[0] == 'WAIT_CTS')
		{
			//stdlib.console.log("Begin WAIT_CTS, outgoing queue length:", link_outgoing_queue.length);
			for (var x = 0; x + 4 <= link_outgoing_queue.length; x++)
			{
				//                                TI92p_PC / V200_PC                  CMD_CTS
				if (   (link_outgoing_queue[x] == 0x88 && link_outgoing_queue[x+1] == 0x09)
				//                                TI89_PC / TI89t_PC                  CMD_CTS
				    || (link_outgoing_queue[x] == 0x98 && link_outgoing_queue[x+1] == 0x09))
				{
					// libticalcs: ti89_recv_CTS indicates that length can be nonzero for failure
					// FIXME: better error handling !
					if (link_outgoing_queue[x+2] != 0 || link_outgoing_queue[x+3] != 0) {
						link_reset_state("CTS");
					}
					else {
						dump_outgoing_queue("WAIT_CTS Before: ");

						link_outgoing_queue.splice(0, x+4);
						link_incoming_queue.shift();
						stdlib.console.log("Eaten an item in WAIT_CTS", x);

						dump_outgoing_queue("After: ");
					}
				}
			}
			//stdlib.console.log("End WAIT_CTS, outgoing queue length:", link_outgoing_queue.length);
		}
		else if (link_incoming_queue[0] == 'WAIT_VAR')
		{
			// WIP
			//stdlib.console.log("Begin WAIT_VAR, outgoing queue length:", link_outgoing_queue.length);
			for (var x = 0; x + 4 <= link_outgoing_queue.length; x++)
			{
				//                                TI92p_PC / V200_PC                  CMD_VAR
				if (   (link_outgoing_queue[x] == 0x88 && link_outgoing_queue[x+1] == 0x06)
				//                                TI89_PC / TI89t_PC                  CMD_VAR
				    || (link_outgoing_queue[x] == 0x98 && link_outgoing_queue[x+1] == 0x06))
				{
					// TODO: error handling
					var length = link_outgoing_queue[x+2] + link_outgoing_queue[x+3] * 256;
					dump_outgoing_queue("WAIT_VAR Before: ");

					// Skip 4-byte header.
					link_outgoing_queue.splice(0, x+4); // 2 checksum bytes
					link_incoming_queue.shift();
					stdlib.console.log("Eaten an item (VAR) in WAIT_VAR", x);

					dump_outgoing_queue("After: ");
				}
				//                                  TI92p_PC / V200_PC                  CMD_EOT
				else if ((link_outgoing_queue[x] == 0x88 && link_outgoing_queue[x+1] == 0x92)
				//                                  TI89_PC / TI89t_PC                  CMD_EOT
				      || (link_outgoing_queue[x] == 0x98 && link_outgoing_queue[x+1] == 0x92))
				{
					// For implementation of non-silent receive.
					// TODO: error handling
					process_recv_CNTEOT(x);
				}

			}
			//stdlib.console.log("End WAIT_VAR, outgoing queue length:", link_outgoing_queue.length);
		}
		else if (link_incoming_queue[0] == 'WAIT_XDP')
		{
			// WIP
			//stdlib.console.log("Begin WAIT_XDP, outgoing queue length:", link_outgoing_queue.length);
			for (var x = 0; x + 4 <= link_outgoing_queue.length; x++)
			{
				//                                TI92p_PC / V200_PC                  CMD_XDP
				if (   (link_outgoing_queue[x] == 0x88 && link_outgoing_queue[x+1] == 0x15)
				//                                TI89_PC / TI89t_PC                  CMD_XDP
				    || (link_outgoing_queue[x] == 0x98 && link_outgoing_queue[x+1] == 0x15))
				{
					// TODO: error handling
					process_recv_XDP(x);
				}
			}
			//stdlib.console.log("End WAIT_XDP, outgoing queue length:", link_outgoing_queue.length);
		}
		else if (link_incoming_queue[0] == 'WAIT_CNT')
		{
			// WIP
			//stdlib.console.log("Begin WAIT_CNT, outgoing queue length:", link_outgoing_queue.length);
			for (var x = 0; x + 4 <= link_outgoing_queue.length; x++)
			{
				//                                TI92p_PC / V200_PC                  CMD_CNT
				if (   (link_outgoing_queue[x] == 0x88 && link_outgoing_queue[x+1] == 0x78)
				//                                TI89_PC / TI89t_PC                  CMD_CNT
				    || (link_outgoing_queue[x] == 0x98 && link_outgoing_queue[x+1] == 0x78)
				//                                TI92p_PC / V200_PC                  CMD_EOT
				    || (link_outgoing_queue[x] == 0x88 && link_outgoing_queue[x+1] == 0x92)
				//                                TI89_PC / TI89t_PC                  CMD_EOT
				    || (link_outgoing_queue[x] == 0x98 && link_outgoing_queue[x+1] == 0x92))
				{
					// TODO: error handling
					process_recv_CNTEOT(x);
				}
			}
			//stdlib.console.log("End WAIT_CNT, outgoing queue length:", link_outgoing_queue.length);
		}
	}
};

// libtifiles: types89.c
function buildFileExtensionFromVartype()
{
	var prefix = (calculator_model == 1 || calculator_model == 9) ? ".89" : ((calculator_model == 8) ? ".v2" : ".9x");
	var suffix = "";
	switch (link_recv_vartype) {
		case 0:  suffix = "e"; break; // Expression
		case 4:  suffix = "l"; break; // List
		case 6:  suffix = "m"; break; // Matrix
		case 10: suffix = "c"; break; // Data
		case 11: suffix = "t"; break; // Text
		case 12: suffix = "s"; break; // String
		case 13: suffix = "d"; break; // GDB (infrequent)
		case 14: suffix = "a"; break; // Geometry figure (infrequent)
		case 16: suffix = "i"; break; // Picture
		case 18: suffix = "p"; break; // Program
		case 19: suffix = "f"; break; // Function
		case 20: suffix = "x"; break; // Macro (infrequent)
		case 28: suffix = "y"; break; // Other
		//case 29: suffix = "g"; break; // Group
		case 33: suffix = "z"; break; // Assembly program
		//case 35: suffix = "u"; break; // OS Upgrade
		case 36: suffix = "k"; break; // FlashApp
		//case 37: suffix = "q"; break; // Certificate file
		default: suffix = "?"; break;
	}
	return prefix + suffix;
}

function getFileData()
{
	ui.getFileData(new Blob([link_recv_data], {type: "application/octet-binary"}));
}

function get_link_config() { return link_config; }
function set_link_config(value)
{
	link_config = value&255;
	//stdlib.console.log("writing link configuation: " + emu.to_hex(link_config, 2));
	if (value & 2 == 0) transmit_finished = false;
}
function set_reset_upon_ack_with_len(value) { reset_upon_ack_with_len = value; }

function get_link_incoming_queue() { return link_incoming_queue; }
function get_link_outgoing_queue() { return link_outgoing_queue; }

function get_link_recv_varsize() { return link_recv_varsize; }
function get_link_recv_vartype() { return link_recv_vartype; }
function get_link_recv_varname() { return link_recv_varname; }
function get_link_recv_foldername() { return link_recv_foldername; }
function get_link_recv_data() { return link_recv_data; }
function get_link_dirlist_vars() { return link_dirlist_vars; }
function get_link_dirlist_apps() { return link_dirlist_apps; }

return {
	// Functions called directly from events on elements in the HTML page
	getFileData : getFileData,

	// Setter functions called from a script in the HTML page.
	setUI : setUI,
	setEmu : setEmu,

	// Setter functions called from the core
	link_handling : link_handling,
	setCalculatorModel : setCalculatorModel,

	link_incoming_queue : get_link_incoming_queue,
	link_outgoing_queue : get_link_outgoing_queue,

	dump_incoming_queue : dump_incoming_queue,
	dump_outgoing_queue : dump_outgoing_queue,

	sendfile : sendfile,
	sendkey : sendkey,
	sendkeys : sendkeys,
	recvfile : recvfile,
	recvfile_ns: recvfile_ns,
	dirlist: dirlist,

	compute_link_status : compute_link_status,
	read_byte : read_byte,
	write_byte : write_byte,
	reset_arrays : reset_arrays,

	link_recv_varsize : get_link_recv_varsize,
	link_recv_vartype : get_link_recv_vartype,
	link_recv_varname : get_link_recv_varname,
	link_recv_foldername : get_link_recv_foldername,
	link_recv_data : get_link_recv_data,
	link_dirlist_vars : get_link_dirlist_vars,
	link_dirlist_apps : get_link_dirlist_apps,
	buildFileExtensionFromVartype : buildFileExtensionFromVartype,

	get_link_config : get_link_config,
	set_link_config : set_link_config,
	set_reset_upon_ack_with_len : set_reset_upon_ack_with_len,

	_save_state : _save_state,
	_restore_state : _restore_state

};

}


function TI68kEmulatorUIModule(stdlib) {
"use strict";

var frames_for_averaging = 3;
var calcscreen = new Uint8Array(240 * 128 * frames_for_averaging); // stores multiple frames (defaulting to 3) of pixel data for averaging
var frame = 0;
var emu = false;
var link = false;
var bitmap = false;
var context = false;
var calculator_model = 1;
var set_skin = function() { };
var draw_calcscreen = function(address, ram) { } ;
var display_no_rom_loaded = function() {  }
var screen_scaling_ratio = 2; // 2:1 by default
var screen_enabled = true;
var contrast = 0xff;
var black_color = 0x00;
var white_color = 0x7f;

var elementid_calcmap = 'calcmap';
var elementid_area = 'area';
var elementid_calcimg = 'calcimg';
var elementid_calcimg1 = 'calcimg';
var elementid_calcimg2 = 'calcimg2';
var elementid_screen = 'screen';
var elementid_smallskin = 'smallskin';
var elementid_largeskin = 'largeskin';
var elementid_textandbuttons = 'textandbuttons';
var elementid_pngimage = 'pngimage';
var elementid_pngbutton = 'pngbutton';
var elementid_hidebutton = 'hidebutton';
var elementid_pauseemulator = 'pauseemulator';
var elementid_resumeemulator = 'resumeemulator';
var elementid_speedup = 'speedup';
var elementid_slowdown = 'slowdown';
var elementid_romfile = 'romfile';
var elementid_downloadfile = 'downloadfile';

// -------------------- Variables above this line should be saved and restored --------------------

function _save_state()
{
	var emustate = new Object();
	return emustate;
}

function _restore_state(linkstate)
{
	if (typeof(linkstate) === "object") {
		// TODO
	}
	else {
		stdlib.console.log("Refusing to restore state from something not an object / from an object without the expected sub-objects");
	}
}

function draw_calcscreen_89_89T(address, ram)
{
	var pixel = frame;
	if (screen_enabled) {
		for (var y = 0; y < 100; y++) {
			for (var x = 0; x < 10; x++) {
				var b = ram[address++];
				for (var bit = 15; bit >= 0; bit--) {
					var color = b & 0x8000 ? black_color : white_color;
					b <<= 1;
					calcscreen[pixel] = color;
					pixel += frames_for_averaging;
				}
			}
			address += 5;
			pixel += 5 * frames_for_averaging * 16;
		}
	}
	else {
		for (var y = 0; y < 128 * 240; y++) {
			calcscreen[pixel] = white_color;
			pixel += frames_for_averaging;
		}
	}

	frame++;
	if (frame == frames_for_averaging) frame = 0;
};

function draw_calcscreen_92P_V200(address, ram)
{
	var pixel = frame;
	if (screen_enabled) {
		for (var y = 0; y < 128; y++) {
			for (var x = 0; x < 15; x++) {
				var b = ram[address++];
				for (var bit = 15; bit >= 0; bit--) {
					var color = b & 0x8000 ? black_color : white_color;
					b <<= 1;
					calcscreen[pixel] = color;
					pixel += frames_for_averaging;
				}
			}
		}
	}
	else {
		for (var y = 0; y < 128 * 240; y++) {
			calcscreen[pixel] = white_color;
			pixel += frames_for_averaging;
		}
	}

	frame++;
	if (frame == frames_for_averaging) frame = 0;
};

function output_calcscreen_to_bitmap_scale1(calcscreen, buff)
{
	var pixel = 0;
	var p = 0;

	for (var y = 0; y < 128; y++) {
		for (var x = 0; x < 240; x++) {
			var color = 0;
			for (var i = 0; i < frames_for_averaging; i++) {
				color += calcscreen[pixel++];
			}
			buff[p] = color;
			buff[p + 1] = color;
			buff[p + 2] = color;
			p+=4;
		}
	}
};

function output_calcscreen_to_bitmap_scale2(calcscreen, buff)
{
	var pixel = 0;
	var p = 0;

	for (var y = 0; y < 128; y++) {
		for (var x = 0; x < 240; x++) {
			var color = 0;
			for (var i = 0; i < frames_for_averaging; i++) {
				color += calcscreen[pixel++];
			}
			buff[p] = color;
			buff[p + 1] = color;
			buff[p + 2] = color;
			buff[p + 4] = color;
			buff[p + 5] = color;
			buff[p + 6] = color;
			buff[p + 1920] = color;
			buff[p + 1921] = color;
			buff[p + 1922] = color;
			buff[p + 1924] = color;
			buff[p + 1925] = color;
			buff[p + 1926] = color;
			p+=8;
		}
		p += 1920;
	}
};

function output_calcscreen_to_bitmap_scale3(calcscreen, buff)
{
	var pixel = 0;
	var pixel = 0;
	var p = 0;

	for (var y = 0; y < 128; y++) {
		for (var x = 0; x < 240; x++) {
			var color = 0;
			for (var i = 0; i < frames_for_averaging; i++) {
				color += calcscreen[pixel++];
			}
			buff[p] = color;
			buff[p + 1] = color;
			buff[p + 2] = color;
			buff[p + 4] = color;
			buff[p + 5] = color;
			buff[p + 6] = color;
			buff[p + 8] = color;
			buff[p + 9] = color;
			buff[p + 10] = color;
			buff[p + 2880] = color;
			buff[p + 2881] = color;
			buff[p + 2882] = color;
			buff[p + 2884] = color;
			buff[p + 2885] = color;
			buff[p + 2886] = color;
			buff[p + 2888] = color;
			buff[p + 2889] = color;
			buff[p + 2890] = color;
			buff[p + 5760] = color;
			buff[p + 5761] = color;
			buff[p + 5762] = color;
			buff[p + 5764] = color;
			buff[p + 5765] = color;
			buff[p + 5766] = color;
			buff[p + 5768] = color;
			buff[p + 5769] = color;
			buff[p + 5770] = color;
			p+=12;
		}
		p += 5760;
	}
};

function output_calcscreen_to_bitmap_scale4(calcscreen, buff)
{
	var pixel = 0;
	var p = 0;

	for (var y = 0; y < 3840 * 128; y += 3840) {
		for (var x = 0; x < 240; x++) {
			var color = 0;
			for (var i = 0; i < frames_for_averaging; i++) {
				color += calcscreen[pixel++];
			}
			buff[p] = color;
			buff[p + 1] = color;
			buff[p + 2] = color;
			buff[p + 4] = color;
			buff[p + 5] = color;
			buff[p + 6] = color;
			buff[p + 8] = color;
			buff[p + 9] = color;
			buff[p + 10] = color;
			buff[p + 12] = color;
			buff[p + 13] = color;
			buff[p + 14] = color;
			buff[p + 3840] = color;
			buff[p + 3841] = color;
			buff[p + 3842] = color;
			buff[p + 3844] = color;
			buff[p + 3845] = color;
			buff[p + 3846] = color;
			buff[p + 3848] = color;
			buff[p + 3849] = color;
			buff[p + 3850] = color;
			buff[p + 3852] = color;
			buff[p + 3853] = color;
			buff[p + 3854] = color;
			buff[p + 7680] = color;
			buff[p + 7681] = color;
			buff[p + 7682] = color;
			buff[p + 7684] = color;
			buff[p + 7685] = color;
			buff[p + 7686] = color;
			buff[p + 7688] = color;
			buff[p + 7689] = color;
			buff[p + 7690] = color;
			buff[p + 7692] = color;
			buff[p + 7693] = color;
			buff[p + 7694] = color;
			buff[p + 11520] = color;
			buff[p + 11521] = color;
			buff[p + 11522] = color;
			buff[p + 11524] = color;
			buff[p + 11525] = color;
			buff[p + 11526] = color;
			buff[p + 11528] = color;
			buff[p + 11529] = color;
			buff[p + 11530] = color;
			buff[p + 11532] = color;
			buff[p + 11533] = color;
			buff[p + 11534] = color;
			p+=16;
		}
		p += 11520;
	}
};

// Split the function to help with profiling.
function draw_screen(address, ram)
{
	draw_calcscreen(address, ram);
	if (screen_scaling_ratio == 1) {
		output_calcscreen_to_bitmap_scale1(calcscreen, bitmap.data);
		context.putImageData(bitmap, 0, 0);
	}
	else if (screen_scaling_ratio == 2) {
		output_calcscreen_to_bitmap_scale2(calcscreen, bitmap.data);
		context.putImageData(bitmap, 0, 0);
	}
	else if (screen_scaling_ratio == 3) {
		output_calcscreen_to_bitmap_scale3(calcscreen, bitmap.data);
		context.putImageData(bitmap, 0, 0);
	}
	else if (screen_scaling_ratio == 4) {
		output_calcscreen_to_bitmap_scale4(calcscreen, bitmap.data);
		context.putImageData(bitmap, 0, 0);
	}
	// else do nothing.
};

function create_button(shape, coords, keynumber)
{
	var map = document.getElementById(elementid_calcmap);
	var area = document.createElement(elementid_area);
	area.shape = shape;
	//area.coords = coords;
	area.coords = '0,0,0,0';
	area.onmousedown = function() { emu.setKey(keynumber, 1); }
	area.ontouchstart = function() { emu.setKey(keynumber, 1); }
	area.onmouseup = function() { emu.setKey(keynumber, 0); }
	area.ontouchend = function() { emu.setKey(keynumber, 0); }
	area.ontouchleave = function() { emu.setKey(keynumber, 0); }
	area.ontouchcancel = function() { emu.setKey(keynumber, 0); }
	map.appendChild(area);
}

function create_on_button(shape, coords)
{
	var map = document.getElementById(elementid_calcmap);
	var area = document.createElement(elementid_area);
	area.shape = shape;
	//area.coords = coords;
	area.coords = '0,0,0,0';
	area.onmousedown = function() { emu.setONKeyPressed(); }
	area.ontouchstart = function() { emu.setONKeyPressed(); }
	area.onmouseup = function() { emu.setONKeyReleased(); }
	area.ontouchend = function() { emu.setONKeyReleased(); }
	area.ontouchleave = function() { emu.setONKeyReleased(); }
	area.ontouchcancel = function() { emu.setONKeyReleased(); }
	map.appendChild(area);
}

var shift_pressed = false;
function handle_keys_89_89T(event)
{
	var e = event || stdlib.event;
	e.preventDefault();
	var value;
	switch (e.type) {
		case 'keydown':
			value = 1;
			break;
		case 'keyup':
			value = 0;
			break;
		default:
			return true;
	}

	//console.log(e.keyCode);

	switch (e.keyCode)
	{
		// 1) single keypress -> single setKey().
		case 38: emu.setKey(0, value); break; // up
		case 37: emu.setKey(1, value); break; // left
		case 40: emu.setKey(2, value); break; // down
		case 39: emu.setKey(3, value); break; // right
		case 18: emu.setKey(4, value); break; // Alt, simulated 2nd
		case 192: emu.setKey(4, value); break; // backquote, simulated 2nd
		// case 16: emu.setKey(5, value); break; // SHIFT
		case 16: if (value == 1) shift_pressed = true; else shift_pressed = false; break; // SHIFT
		case 17: emu.setKey(6, value); break; // Ctrl, simulated Diamond
		// No binding for Alpha

		case 13: emu.setKey(8, value); break; // ENTER
		case 43: emu.setKey(9, value); break; // + (Opera)
		case 107: emu.setKey(9, value); break; // + (all browsers but Opera)
		case 45: emu.setKey(10, value); break; // - (Opera)
		case 109: emu.setKey(10, value); break; // - (all browsers but Opera)
		case 42: emu.setKey(11, value); break; // * (Opera)
		case 106: emu.setKey(11, value); break; // * (Opera)
		case 47: emu.setKey(12, value); break; // / (all browsers but Opera)
		case 111: emu.setKey(12, value); break; // / (all browsers but Opera)
		// No binding for ^ (too inconsistent across browsers)
		case 46: emu.setKey(14, value); break; // Del, simulated clear
		case 116: emu.setKey(15, value); break; // F5

		case 59: emu.setKey(16, value); break; // ;, simulated (-) (Firefox, Opera)
		case 186: emu.setKey(16, value); break; // ;, simulated (-) (Chrome, IE, Safari)
		case 51: emu.setKey(17, value); break; // 3
		case 99: emu.setKey(17, value); break; // 3 (keypad)
		case 54: if (shift_pressed) emu.setKey(13, value); else emu.setKey(18, value); break; // 6
		case 102: if (shift_pressed) emu.setKey(13, value); else emu.setKey(18, value); break; // 6 (keypad)
		case 57: if (shift_pressed) emu.setKey(36, value); else emu.setKey(19, value); break; // 9
		case 105: if (shift_pressed) emu.setKey(36, value); else emu.setKey(19, value); break; // 9 (keypad)
		// No binding for , (too inconsistent across browsers)
		case 84: emu.setKey(21, value); break; // T
		case 8: emu.setKey(22, value); break; // backspace
		case 115: emu.setKey(23, value); break; // F4

		case 190: emu.setKey(24, value); break; // . (decimal point)
		case 50: emu.setKey(25, value); break; // 2
		case 98: emu.setKey(25, value); break; // 2 (keypad)
		case 53: emu.setKey(26, value); break; // 5
		case 101: emu.setKey(26, value); break; // 5 (keypad)
		case 56: if (shift_pressed) emu.setKey(11, value); else emu.setKey(27, value); break; // 8
		case 104: if (shift_pressed) emu.setKey(11, value); else emu.setKey(27, value); break; // 8 (keypad)
		case 90: emu.setKey(29, value); break; // Z
		case 117: emu.setKey(30, value); break; // F6, simulated CATALOG
		case 114: emu.setKey(31, value); break; // F3
		case 119: emu.setKey(31, value); break; // F8 is treated as F3

		case 48: if (shift_pressed) emu.setKey(28, value); else emu.setKey(32, value); break; // 0
		case 96: if (shift_pressed) emu.setKey(28, value); else emu.setKey(32, value); break; // 0 (keypad)
		case 49: emu.setKey(33, value); break; // 1
		case 97: emu.setKey(33, value); break; // 1 (keypad)
		case 52: emu.setKey(34, value); break; // 4
		case 100: emu.setKey(34, value); break; // 4 (keypad)
		case 55: emu.setKey(35, value); break; // 7
		case 101: emu.setKey(35, value); break; // 7 (keypad)
		// No binding for ( (too inconsistent across browsers)
		case 89: emu.setKey(37, value); break; // Y
		// No binding for MODE
		case 113: emu.setKey(39, value); break; // F2
		case 118: emu.setKey(39, value); break; // F7 is treated as F2

		case 120: emu.setKey(40, value); break; // F9, simulated APPS
		// No binding for STO (TAB switches focus)
		case 45: emu.setKey(42, value); break; // Insert, simulated EE
		// No binding for |
		// No binding for = (too inconsistent across browsers)
		case 88: emu.setKey(45, value); break; // X
		// No binding for HOME
		case 112: emu.setKey(47, value); break; // F1

		case 27: emu.setKey(48, value); break; // ESC

		case 145: if (value == 1) emu.setONKeyPressed(); else emu.setONKeyReleased(); break; // Scroll Lock, simulated ON.

		// 2) single keypress -> two setKey().
		case 85: emu.setKey(7, value); emu.setKey(9, value); break; // U
		case 79: emu.setKey(7, value); emu.setKey(10, value); break; // O
		case 74: emu.setKey(7, value); emu.setKey(11, value); break; // J
		case 69: emu.setKey(7, value); emu.setKey(12, value); break; // E

		case 83: emu.setKey(7, value); emu.setKey(17, value); break; // S
		case 78: emu.setKey(7, value); emu.setKey(18, value); break; // N
		case 73: emu.setKey(7, value); emu.setKey(19, value); break; // I
		case 68: emu.setKey(7, value); emu.setKey(20, value); break; // D

		case 87: emu.setKey(7, value); emu.setKey(24, value); break; // W
		case 82: emu.setKey(7, value); emu.setKey(25, value); break; // R
		case 77: emu.setKey(7, value); emu.setKey(26, value); break; // M
		case 72: emu.setKey(7, value); emu.setKey(27, value); break; // H
		case 67: emu.setKey(7, value); emu.setKey(28, value); break; // C

		case 86: emu.setKey(7, value); emu.setKey(32, value); break; // V
		case 81: emu.setKey(7, value); emu.setKey(33, value); break; // Q
		case 76: emu.setKey(7, value); emu.setKey(34, value); break; // L
		case 71: emu.setKey(7, value); emu.setKey(35, value); break; // G
		case 66: emu.setKey(7, value); emu.setKey(36, value); break; // B

		case 80: emu.setKey(7, value); emu.setKey(41, value); break; // P
		case 75: emu.setKey(7, value); emu.setKey(42, value); break; // K
		case 70: emu.setKey(7, value); emu.setKey(43, value); break; // F
		case 65: emu.setKey(7, value); emu.setKey(44, value); break; // A

		// KeyCode Changed
		case 9: emu.setKey(5, value); break; // TAB => SHIFT
		
		case 189: emu.setKey(10, value); break; // Minus
		case 187: if (shift_pressed) emu.setKey(9, value); else emu.setKey(44, value); break; // Plus
		case 191: emu.setKey(12, value); break; // Minus
		case 188: emu.setKey(20, value); break; // Comma
		case 222: emu.setKey(20, value); break; // Comma
	}

	return true; // suppress default action
}

function handle_keys_92P_V200(event)
{
	var e = event || stdlib.event;
	e.preventDefault();
	var value;
	switch(e.type) {
		case 'keydown':
			value = 1;
			break;
		case 'keyup':
			value = 0;
			break;
		default:
			return true;
	}
	switch (e.keyCode)
	{
		case 18: emu.setKey(0, value); break; // Alt, simulated 2nd
		case 192: emu.setKey(0, value); break; // backquote, simulated 2nd
		case 17: emu.setKey(1, value); break; // Ctrl, simulated Diamond
		case 16: emu.setKey(2, value); break; // SHIFT
		case 20: emu.setKey(3, value); break; // Caps Lock, simulated LOCK (hand)
		case 220: emu.setKey(3, value); break; // backslash, simulated LOCK (hand)
		case 37: emu.setKey(4, value); break; // left
		case 38: emu.setKey(5, value); break; // up
		case 39: emu.setKey(6, value); break; // right
		case 40: emu.setKey(7, value); break; // down

		// No key at index 8 on the emulated keyboard
		case 90: emu.setKey(9, value); break; // Z
		case 83: emu.setKey(10, value); break; // S
		case 87: emu.setKey(11, value); break; // W
		case 119: emu.setKey(12, value); break; // F8
		case 49: emu.setKey(13, value); break; // 1
		case 97: emu.setKey(13, value); break; // 1 (keypad)
		case 50: emu.setKey(14, value); break; // 2
		case 98: emu.setKey(14, value); break; // 2 (keypad)
		case 51: emu.setKey(15, value); break; // 3
		case 99: emu.setKey(15, value); break; // 3 (keypad)

		// No key at index 16 on the emulated keyboard
		case 88: emu.setKey(17, value); break; // X
		case 68: emu.setKey(18, value); break; // D
		case 69: emu.setKey(19, value); break; // E
		case 114: emu.setKey(20, value); break; // F3
		case 52: emu.setKey(21, value); break; // 4
		case 100: emu.setKey(21, value); break; // 4 (keypad)
		case 53: emu.setKey(22, value); break; // 5
		case 101: emu.setKey(22, value); break; // 5 (keypad)
		case 54: emu.setKey(23, value); break; // 6
		case 102: emu.setKey(23, value); break; // 6 (keypad)

		// No binding for STO (TAB switches focus)
		case 67: emu.setKey(25, value); break; // C
		case 70: emu.setKey(26, value); break; // F
		case 82: emu.setKey(27, value); break; // R
		case 118: emu.setKey(28, value); break; // F7
		case 55: emu.setKey(29, value); break; // 7
		case 103: emu.setKey(29, value); break; // 7 (keypad)
		case 56: emu.setKey(30, value); break; // 8
		case 104: emu.setKey(30, value); break; // 8 (keypad)
		case 57: emu.setKey(31, value); break; // 9
		case 105: emu.setKey(31, value); break; // 9 (keypad)

		case 32: emu.setKey(32, value); break; // spacebar
		case 86: emu.setKey(33, value); break; // V
		case 71: emu.setKey(34, value); break; // G
		case 84: emu.setKey(35, value); break; // T
		case 113: emu.setKey(36, value); break; // F2
		// No binding for ( (too inconsistent across browsers)
		// No binding for ) (too inconsistent across browsers)
		// No binding for , (too inconsistent across browsers)

		case 47: emu.setKey(40, value); break; // / (Opera)
		case 111: emu.setKey(40, value); break; // / (all browsers but Opera)
		case 66: emu.setKey(41, value); break; // B
		case 72: emu.setKey(42, value); break; // H
		case 89: emu.setKey(43, value); break; // Y
		case 117: emu.setKey(44, value); break; // F6
		// No binding for SIN
		// No binding for COS
		// No binding for TAN

		// No binding for ^ (too inconsistent across browsers)
		case 78: emu.setKey(49, value); break; // N
		case 74: emu.setKey(50, value); break; // J
		case 85: emu.setKey(51, value); break; // U
		case 112: emu.setKey(52, value); break; // F1
		// No binding for LN
		// No binding for ENTER2
		case 80: emu.setKey(55, value); break; // P

		// No binding for = (too inconsistent across browsers)
		case 77: emu.setKey(57, value); break; // M
		case 75: emu.setKey(58, value); break; // K
		case 73: emu.setKey(59, value); break; // I
		case 116: emu.setKey(60, value); break; // F5
		case 46: emu.setKey(61, value); break; // Del, simulated Clear
		case 120: emu.setKey(62, value); break; // F9, simulated APPS
		case 42: emu.setKey(63, value); break; // * (Opera)
		case 106: emu.setKey(63, value); break; // * (all browsers but Opera)

		case 8: emu.setKey(64, value); break; // backspace
		// No binding for Theta
		case 76: emu.setKey(66, value); break; // L
		case 79: emu.setKey(67, value); break; // O
		case 43: emu.setKey(68, value); break; // + (Opera)
		case 107: emu.setKey(68, value); break; // + (all browsers but Opera)
		// No binding for MODE
		case 27: emu.setKey(70, value); break; // ESC
		// No key at index 71 on the emulated keyboard

		case 45: emu.setKey(72, value); break; // - (Opera)
		case 109: emu.setKey(72, value); break; // - (all browsers but Opera)
		case 13: emu.setKey(73, value); break; // ENTER1
		case 65: emu.setKey(74, value); break; // A
		case 81: emu.setKey(75, value); break; // Q
		case 115: emu.setKey(76, value); break; // F4
		case 48: emu.setKey(77, value); break; // 0
		case 96: emu.setKey(77, value); break; // 0 (keypad)
		case 190: emu.setKey(78, value); break; // . (decimal point)
		case 59: emu.setKey(79, value); break; // ;, simulated (-) (Firefox, Opera)
		case 186: emu.setKey(79, value); break; // ;, simulated (-) (Chrome, IE, Safari)

		case 145: if (value == 1) emu.setONKeyPressed(); else emu.setONKeyReleased(); break; // Scroll Lock, simulated ON.
	}

	return true; // suppress default action
}

function initkeyhandlers()
{
	if (calculator_model == 3 || calculator_model == 9) // 89 or 89T
	{
		document.onkeydown = handle_keys_89_89T;
		document.onkeyup = handle_keys_89_89T;
	}
	else // 92+ or V200
	{
		document.onkeydown = handle_keys_92P_V200;
		document.onkeyup = handle_keys_92P_V200;
	}
}

function set_large_92p_skin()
{
	screen_scaling_ratio = 2;

	// Replace image.
	var oldimg = document.getElementById(elementid_calcimg);
	var newimg = document.createElement('img');
	newimg.setAttribute('id', elementid_calcimg);
	newimg.setAttribute('src', 'Ti-92plus.jpg');
	newimg.setAttribute('usemap', '#' + elementid_calcmap);
	newimg.setAttribute('style', 'position:absolute;top:0px;left:0px;z-index:3');

	oldimg.parentNode.appendChild(newimg);
	newimg.parentNode.removeChild(oldimg);

	// Move canvas.
	var screen = document.getElementById(elementid_screen);
	screen.setAttribute('style', 'position:absolute;top:49px;left:205px;z-index:1');
	screen.setAttribute('width', '480');
	screen.setAttribute('height', '256');

	var textandbuttons = document.getElementById(elementid_textandbuttons);
	textandbuttons.setAttribute('style', 'display: none');

	// Scaling radio buttons
	document.getElementById(elementid_smallskin).checked=false;
	document.getElementById(elementid_largeskin).checked=true;

	// Replace map.
	var oldmap = document.getElementById(elementid_calcmap);
	var newmap = document.createElement('map');
	newmap.setAttribute('name', elementid_calcmap);
	newmap.setAttribute('id', elementid_calcmap);

	oldmap.parentNode.appendChild(newmap);
	newmap.parentNode.removeChild(oldmap);

	// Create buttons.
	create_button('rect', '140,52,193,112', 3); // LOCK (hand)
	create_button('rect', '871,69,920,108', 5); // Up
	create_button('rect', '871,157,920,196', 7); // Down
	create_button('rect', '834,110,872,156', 4); // Left
	create_button('rect', '921,110,971,156', 6); // Right
	create_button('rect', '724,55,768,95', 0); // 2nd (by cursor pad)
	create_button('rect', '200,497,246,527', 0); // 2nd (lower left) 46,30
	create_button('rect', '137,497,183,527', 1); // diamond
	create_button('rect', '74,450,120,480', 2); // shift
	create_button('rect', '137,451,183,481', 9); // Z
	create_button('rect', '168,401,214,431', 10); // S
	create_button('rect', '136,353,182,393', 11); // W
	create_button('rect', '141,271,184,311', 12); // F8 42,40
	create_button('rect', '724,453,770,483', 13); // 1
	create_button('rect', '784,453,830,483', 14); // 2
	create_button('rect', '845,453,891,483', 15); // 3
	create_button('rect', '200,450,246,480', 17); // X
	create_button('rect', '232,402,278,432', 18); // D
	create_button('rect', '199,354,245,384', 19); // E
	create_button('rect', '75,218,118,259', 20); // F3
	create_button('rect', '724,405,770,435', 21); // 4
	create_button('rect', '785,405,830,435', 22); // 5
	create_button('rect', '845,405,891,431', 23); // 6
	create_button('rect', '264,499,310,529', 24); // STO
	create_button('rect', '263,450,309,480', 25); // C
	create_button('rect', '294,403,340,433', 26); // F
	create_button('rect', '264,354,310,384', 27); // R
	create_button('rect', '141,219,184,259', 28); // F7
	create_button('rect', '724,357,770,387', 29); // 7
	create_button('rect', '785,357,830,387', 30); // 8
	create_button('rect', '845,357,891,387', 31); // 9
	create_button('rect', '327,499,495,529', 32); // SPACE
	create_button('rect', '326,450,372,480', 33); // V
	create_button('rect', '357,403,403,433', 34); // G
	create_button('rect', '327,354,373,384', 35); // T
	create_button('rect', '75,168,118,208', 36); // F2
	create_button('rect', '723,306,768,336', 37); // (
	create_button('rect', '784,306,830,336', 38); // )
	create_button('rect', '844,307,890,337', 39); // ,
	create_button('rect', '904,307,950,337', 40); // /
	create_button('rect', '388,452,434,483', 41); // B
	create_button('rect', '421,403,467,433', 42); // H
	create_button('rect', '389,355,435,385', 43); // Y
	create_button('rect', '141,168,184,208', 44); // F6
	create_button('rect', '724,260,770,290', 45); // SIN
	create_button('rect', '784,260,830,290', 46); // COS
	create_button('rect', '844,260,890,290', 47); // TAN
	create_button('rect', '905,260,951,290', 48); // ^
	create_button('rect', '453,451,499,481', 49); // N
	create_button('rect', '484,403,530,433', 50); // J
	create_button('rect', '452,355,498,385', 51); // U
	create_button('rect', '75,119,118,159', 52); // F1
	create_button('rect', '723,211,769,241', 53); // LN
	create_button('rect', '846,201,949,239', 54); // ENTER2 (by cursor pad)
	create_button('rect', '642,356,688,386', 55); // P
	create_button('rect', '516,500,562,530', 56); // =
	create_button('rect', '515,451,561,481', 57); // M
	create_button('rect', '547,403,593,433', 58); // K
	create_button('rect', '516,356,562,386', 59); // I
	create_button('rect', '141,119,284,159', 60); // F5
	create_button('rect', '724,163,790,193', 61); // CLEAR
	create_button('rect', '785,164,828,237', 62); // APPS
	create_button('rect', '905,357,951,387', 63); // *
	create_button('rect', '579,499,625,529', 64); // BACKSPACE
	create_button('rect', '578,451,624,481', 65); // THETA
	create_button('rect', '610,403,656,433', 66); // L
	create_button('rect', '579,356,623,386', 67); // O
	create_button('rect', '905,453,961,483', 68); // +
	create_button('rect', '724,115,770,145', 69); // MODE
	create_button('rect', '785,59,825,139', 70); // ESC
	create_button('rect', '904,404,950,434', 72); // -
	create_button('rect', '905,500,938,538', 73); // ENTER1 (numeric)
	create_button('rect', '624,454,685,528', 73); // ENTER1 (alphabetic)
	create_button('rect', '106,401,152,431', 74); // A
	create_button('rect', '74,353,120,383', 75); // Q
	create_button('rect', '75,271,118,311', 76); // F4
	create_button('rect', '724,501,770,531', 77); // 0
	create_button('rect', '784,502,830,532', 78); // .
	create_button('rect', '845,501,891,531', 79); // (-)

	create_on_button('rect', '74,497,120,527'); // ON: left of DIAMOND, below SHIFT
}

function set_small_92p_skin()
{
	screen_scaling_ratio = 1;

	// Replace image.
	var oldimg = document.getElementById(elementid_calcimg);
	var newimg = document.createElement('img');
	newimg.setAttribute('id', elementid_calcimg);
	newimg.setAttribute('src', 'ti92p_skinmap.gif');
	newimg.setAttribute('usemap', '#' + elementid_calcmap);
	newimg.setAttribute('style', 'position:absolute;top:0px;left:0px;z-index:3');

	oldimg.parentNode.appendChild(newimg);
	newimg.parentNode.removeChild(oldimg);

	// Move canvas.
	var screen = document.getElementById(elementid_screen);
	screen.setAttribute('style', 'position:relative;top:27px;left:180px;z-index:1');
	screen.setAttribute('width', '240');
	screen.setAttribute('height', '128');

	var textandbuttons = document.getElementById(elementid_textandbuttons);
	textandbuttons.setAttribute('style', 'display: none');

	// Scaling radio buttons
	document.getElementById(elementid_smallskin).checked=true;
	document.getElementById(elementid_largeskin).checked=false;

	// Replace map.
	var oldmap = document.getElementById(elementid_calcmap);
	var newmap = document.createElement('map');
	newmap.setAttribute('name', elementid_calcmap);
	newmap.setAttribute('id', elementid_calcmap);

	oldmap.parentNode.appendChild(newmap);
	newmap.parentNode.removeChild(oldmap);

	// Create buttons.
	create_button('rect', '98,36,141,54', 3); // LOCK (hand)
	create_button('rect', '42,62,85,79', 52); // F1
	create_button('rect', '42,87,85,105', 36); // F2
	create_button('rect', '42,113,85,131', 20); // F3
	create_button('rect', '42,139,85,156', 76); // F4
	create_button('rect', '98,62,141,79', 60); // F5
	create_button('rect', '98,87,141,105', 44); // F6
	create_button('rect', '98,113,141,131', 28); // F7
	create_button('rect', '98,139,141,156', 12); // F8 42,40
	create_button('rect', '2,191,35,209', 75); // Q
	create_button('rect', '45,191,78,209', 11); // W
	create_button('rect', '88,191,121,209', 19); // E
	create_button('rect', '131,191,163,209', 27); // R
	create_button('rect', '173,191,206,209', 35); // T
	create_button('rect', '216,191,249,209', 43); // Y
	create_button('rect', '259,191,292,209', 51); // U
	create_button('rect', '302,191,335,209', 59); // I
	create_button('rect', '344,191,379,209', 67); // O
	create_button('rect', '387,191,421,209', 55); // P
	create_button('rect', '2,244,35,261', 2); // shift
	create_button('rect', '45,244,78,261', 9); // Z
	create_button('rect', '88,244,121,261', 17); // X
	create_button('rect', '131,244,163,261', 25); // C
	create_button('rect', '173,244,206,261', 33); // V
	create_button('rect', '216,244,249,261', 41); // B
	create_button('rect', '259,244,292,261', 49); // N
	create_button('rect', '302,244,335,261', 57); // M
	create_button('rect', '344,244,379,261', 65); // THETA
	create_button('rect', '387,244,421,288', 73); // ENTER1 (alphabetic)

	create_button('rect', '45,270,78,288', 1); // diamond
	create_button('rect', '88,270,121,288', 0); // 2nd (lower left) 46,30
	create_button('rect', '131,270,163,288', 24); // STO
	create_button('rect', '173,270,292,288', 32); // SPACE
	create_button('rect', '302,270,335,288', 56); // =
	create_button('rect', '344,270,379,288', 64); // BACKSPACE

	create_button('rect', '24,217,57,235', 74); // A
	create_button('rect', '67,217,100,235', 10); // S
	create_button('rect', '110,217,143,235', 18); // D
	create_button('rect', '153,217,185,235', 26); // F
	create_button('rect', '195,217,228,235', 34); // G
	create_button('rect', '238,217,271,235', 42); // H
	create_button('rect', '281,217,314,235', 50); // J
	create_button('rect', '324,217,357,235', 58); // K
	create_button('rect', '366,217,400,235', 66); // L

	create_button('rect', '451,10,484,33', 0); // 2nd (by cursor pad)
	create_button('rect', '451,43,484,62', 69); // MODE
	create_button('rect', '451,71,484,80', 61); // CLEAR
	create_button('rect', '451,100,484,110', 53); // LN
	create_button('rect', '451,128,484,147', 45); // SIN
	create_button('rect', '491,128,523,147', 46); // COS
	create_button('rect', '530,128,563,147', 47); // TAN
	create_button('rect', '570,128,602,147', 48); // ^
	create_button('rect', '451,156,484,175', 37); // (
	create_button('rect', '491,156,523,175', 38); // )
	create_button('rect', '530,156,563,175', 39); // ,
	create_button('rect', '570,156,602,175', 40); // /
	create_button('rect', '451,184,484,204', 29); // 7
	create_button('rect', '491,184,523,204', 30); // 8
	create_button('rect', '530,184,563,204', 31); // 9
	create_button('rect', '570,184,602,204', 63); // *
	create_button('rect', '451,212,484,232', 21); // 4
	create_button('rect', '491,212,523,232', 22); // 5
	create_button('rect', '530,212,563,232', 23); // 6
	create_button('rect', '570,212,602,232', 72); // -
	create_button('rect', '451,240,484,260', 13); // 1
	create_button('rect', '491,240,523,260', 14); // 2
	create_button('rect', '530,240,563,260', 15); // 3
	create_button('rect', '570,240,602,260', 68); // +
	create_button('rect', '451,269,484,288', 77); // 0
	create_button('rect', '491,269,523,288', 78); // .
	create_button('rect', '530,269,563,288', 79); // (-)
	create_button('rect', '570,269,602,288', 73); // ENTER1 (numeric)

	create_button('poly', '491,9,535,9,535,18,514,62,491,62', 70); // ESC
	create_button('rect', '491,71,523,119', 62); // APPS
	create_button('rect', '530,92,602,119', 54); // ENTER2 (BY CURSOR)

	create_button('poly', '563,54,532,27,560,15,567,15,595,27,564,54', 5); // Up
	create_button('poly', '563,55,532,82,559,94,568,94,594,82,564,55', 7); // Down
	create_button('poly', '563,54,532,27,520,49,520,60,532,82,563,55', 4); // Left
	create_button('poly', '564,54,595,27,607,45,607,64,594,82,564,55', 6); // Right

	create_on_button('rect', '2,270,35,288'); // ON: left of DIAMOND, below SHIFT
}

function set_small_89_skin()
{
	console.error('called new, modified --- v12.js - set_small_89_skin()');
	//return;

	var displayStyle = 2;
	const calcContainerWidth1 = 9213; const calcContainerLeft1 = 1173; const calcContainerRight1 = 1410;
	const calcContainerHeight1 = 10707; const calcContainerTop1 = 2303; const calcContainerBottom1 = 3087;
	const calcContainerWidth2 = 16013; const calcContainerLeft2 = 2560; const calcContainerRight2 = 1160;
	const calcContainerHeight2 = 11657; const calcContainerTop2 = 1200; const calcContainerBottom2 = 900;
	const calcContainerFitLeft = 0;

	var divideTopRatio = 0.5;

    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    if (windowWidth >= 1024) {
      displayStyle = 2;
    } else if (windowWidth < 1024 && windowWidth >= 768) {
      displayStyle = 2;
    } else {
      displayStyle = 2;
	}
	
    var canvasWidth = windowWidth;
	var canvasHeight = windowHeight * divideTopRatio;
    var calcContainerWidth = calcContainerWidth1; var calcContainerLeft = calcContainerLeft1; var calcContainerRight = calcContainerRight1;
	var calcContainerHeight = calcContainerHeight1; var calcContainerTop = calcContainerTop1; var calcContainerBottom = calcContainerBottom1;
    if (displayStyle == 2) {
      calcContainerWidth = calcContainerWidth2; calcContainerLeft = calcContainerLeft2; calcContainerRight = calcContainerRight2;
	  calcContainerHeight = calcContainerHeight2; calcContainerTop = calcContainerTop2; calcContainerBottom = calcContainerBottom2;
	  if (windowWidth < 768) {
        canvasHeight = canvasWidth * calcContainerHeight / calcContainerWidth;
        divideTopRatio = canvasHeight / windowHeight;
      }
    }
    if (windowWidth > 768) {
	  canvasWidth = canvasHeight * calcContainerWidth / calcContainerHeight;
	}
	
    var xRatio = canvasHeight / calcContainerHeight;
    var yRatio = canvasWidth / calcContainerWidth;
    var xyRatio = xRatio;
    if (yRatio < xyRatio) { xyRatio = yRatio; }

    // Adjust Calculator Skin Image
    var imageWidth = calcContainerWidth * xyRatio;
    var imageHeight = calcContainerHeight * xyRatio;
    var imageTop = (canvasHeight - imageHeight) / 2;
    var imageLeft = (windowWidth - imageWidth) / 2;

    if (displayStyle == 2) {
      var imageFitleft = imageWidth * calcContainerFitLeft / calcContainerWidth;
      if (windowWidth >= 768) {
        if (imageWidth + imageFitleft <= windowWidth) {
          imageLeft = imageLeft - imageFitleft;
        }
      }
    }
	
	screen_scaling_ratio = 1;

	// var oldimg;
  //   if (displayStyle == 1) {
	//   oldimg = document.getElementById(elementid_calcimg1);
  //   } else {
	// 	oldimg = document.getElementById(elementid_calcimg2);
	// }
	
	// var newimg = document.createElement('img');
  //   if (displayStyle == 1) {
  //       $('#calccontainer #calcimg').css('display', "block");
  //       $('#calccontainer #calcimg2').css('display', "none");
	// 	newimg.setAttribute('id', elementid_calcimg1);
	// 	newimg.setAttribute('src', 'img/Device.svg');
  //   } else {
  //       $('#calccontainer #calcimg').css('display', "none");
  //       $('#calccontainer #calcimg2').css('display', "block");
	// 	newimg.setAttribute('id', elementid_calcimg2);
	// 	newimg.setAttribute('src', 'img/Device-90.svg');
	// }
	// newimg.setAttribute('usemap', '#' + elementid_calcmap);
	// newimg.setAttribute('style', 'position:absolute;z-index:3;top:'+imageTop+'px;left:'+imageLeft+'px;width:'+imageWidth+'px;height:'+imageHeight+'px');

	// oldimg.parentNode.appendChild(newimg);
	// newimg.parentNode.removeChild(oldimg);

	// Move canvas.
    var screenTop = imageTop +  imageHeight * calcContainerTop / calcContainerHeight;
    var screenLeft = imageLeft + imageWidth * calcContainerLeft / calcContainerWidth;
    var screenWidth = imageWidth * (calcContainerWidth - calcContainerLeft - calcContainerRight) / calcContainerWidth;
	var screenHeight = imageHeight * (calcContainerHeight - calcContainerTop - calcContainerBottom) / calcContainerHeight;
	
	var screen = document.getElementById(elementid_screen);
	screen.setAttribute('style', 'position:relative;z-index:1;top:'+screenTop+'px;left:'+screenLeft+'px;width:'+screenWidth+'px;height:'+screenHeight+'px');
	screen.setAttribute('width', '160');
	screen.setAttribute('height', '100');

	var textandbuttons = document.getElementById(elementid_textandbuttons);
	textandbuttons.setAttribute('style', 'display: none');

	// Scaling radio buttons
	document.getElementById(elementid_smallskin).checked=true;
	document.getElementById(elementid_largeskin).checked=false;

	// Replace map.
	var oldmap = document.getElementById(elementid_calcmap);
	var newmap = document.createElement('map');
	newmap.setAttribute('name', elementid_calcmap);
	newmap.setAttribute('id', elementid_calcmap);

	oldmap.parentNode.appendChild(newmap);
	newmap.parentNode.removeChild(oldmap);

	// Create buttons.
	create_button('rect', '23,151,51,161', 47); // F1
	create_button('rect', '60,151,87,161', 39); // F2
	create_button('rect', '94,151,122,161', 31); // F3
	create_button('rect', '130,151,157,161', 23); // F4
	create_button('rect', '166,151,194,161', 15); // F5

	create_button('rect', '23,186,51,201', 4); // 2ND
	create_button('rect', '60,186,87,201', 5); // SHIFT
	create_button('rect', '94,186,122,201', 48); // ESC

	create_button('poly', '132,181,143,181,149,187,149,208,143,215,132,215', 1); // LEFT
	create_button('poly', '198,181,187,181,181,187,181,208,187,215,198,215', 3); // RIGHT
	create_button('poly', '148,171,148,182,154,188,176,188,182,182,182,171', 0); // UP
	create_button('poly', '148,226,148,215,154,209,176,209,182,215,182,226', 2); // DOWN

	create_button('rect', '23,211,51,226', 6); // DIAMOND
	create_button('rect', '60,211,87,226', 7); // ALPHA
	create_button('rect', '94,211,122,226', 40); // APPS

	create_button('rect', '23,236,51,251', 46); // HOME
	create_button('rect', '60,236,87,251', 38); // MODE
	create_button('rect', '94,236,122,251', 30); // CATALOG
	create_button('rect', '130,236,157,251', 22); // BACKSPACE
	create_button('rect', '166,236,194,251', 14); // CLEAR

	create_button('rect', '23,262,51,277', 45); // X
	create_button('rect', '60,262,87,277', 37); // Y
	create_button('rect', '94,262,122,277', 29); // Z
	create_button('rect', '130,262,157,277', 21); // T
	create_button('rect', '166,262,194,277', 13); // ^

	create_button('rect', '23,287,51,303', 44); // =
	create_button('rect', '60,287,87,303', 36); // (
	create_button('rect', '94,287,122,303', 28); // )
	create_button('rect', '130,287,157,303', 20); // ,
	create_button('rect', '166,287,194,303', 12); // /

	create_button('rect', '23,314,51,328', 43); // |
	create_button('rect', '60,311,87,329', 35); // 7
	create_button('rect', '94,311,122,329', 27); // 8
	create_button('rect', '130,311,157,329', 19); // 9
	create_button('rect', '166,314,194,328', 11); // *

	create_button('rect', '23,339,51,354', 42); // EE
	create_button('rect', '60,337,87,355', 34); // 4
	create_button('rect', '94,337,122,355', 26); // 5
	create_button('rect', '130,337,157,355', 18); // 6
	create_button('rect', '166,339,194,354', 10); // -

	create_button('rect', '23,364,51,379', 41); // STO
	create_button('rect', '60,362,87,381', 33); // 1
	create_button('rect', '94,362,122,381', 25); // 2
	create_button('rect', '130,362,157,381', 17); // 3
	create_button('rect', '166,364,194,379', 9); // +

	create_button('rect', '60,388,87,407', 32); // 0
	create_button('rect', '94,388,122,407', 24); // .
	create_button('rect', '130,388,157,407', 16); // (-)
	create_button('rect', '166,390,194,410', 8); // ENTER

	create_on_button('rect', '23,388,51,407'); // ON: below STO.
}

function set_small_v200_skin()
{
	screen_scaling_ratio = 1;

	// Replace image.
	var oldimg = document.getElementById(elementid_calcimg);
	var newimg = document.createElement('img');
	newimg.setAttribute('id', elementid_calcimg);
	newimg.setAttribute('src', 'tiv200_skinmap.gif');
	newimg.setAttribute('usemap', '#' + elementid_calcmap);
	newimg.setAttribute('style', 'position:absolute;top:0px;left:0px;z-index:3');

	oldimg.parentNode.appendChild(newimg);
	newimg.parentNode.removeChild(oldimg);

	// Move canvas.
	var screen = document.getElementById(elementid_screen);
	screen.setAttribute('style', 'position:relative;top:34px;left:70px;z-index:1');
	screen.setAttribute('width', '240');
	screen.setAttribute('height', '128');

	var textandbuttons = document.getElementById(elementid_textandbuttons);
	textandbuttons.setAttribute('style', 'display: none');

	// Scaling radio buttons
	document.getElementById(elementid_smallskin).checked=true;
	document.getElementById(elementid_largeskin).checked=false;

	// Replace map.
	var oldmap = document.getElementById(elementid_calcmap);
	var newmap = document.createElement('map');
	newmap.setAttribute('name', elementid_calcmap);
	newmap.setAttribute('id', elementid_calcmap);

	oldmap.parentNode.appendChild(newmap);
	newmap.parentNode.removeChild(oldmap);

	// Create buttons.
	create_button('rect', '24,175,54,198', 3); // LOCK (hand)

	create_button('rect', '69,180,93,192', 52); // F1
	create_button('rect', '100,180,123,192', 36); // F2
	create_button('rect', '131,180,154,192', 20); // F3
	create_button('rect', '162,180,185,192', 76); // F4
	create_button('rect', '193,180,215,192', 60); // F5
	create_button('rect', '224,180,246,192', 44); // F6
	create_button('rect', '254,180,277,192', 28); // F7
	create_button('rect', '285,180,308,192', 12); // F8 42,40

	create_button('rect', '41,207,65,221', 75); // Q
	create_button('rect', '72,207,95,221', 11); // W
	create_button('rect', '103,207,126,221', 19); // E
	create_button('rect', '134,207,157,221', 27); // R
	create_button('rect', '164,207,188,221', 35); // T
	create_button('rect', '195,207,219,221', 43); // Y
	create_button('rect', '226,207,250,221', 51); // U
	create_button('rect', '257,207,280,221', 59); // I
	create_button('rect', '288,207,311,221', 67); // O
	create_button('rect', '318,207,342,221', 55); // P

	create_button('rect', '41,250,65,264', 2); // shift
	create_button('rect', '72,250,95,264', 9); // Z
	create_button('rect', '103,250,126,264', 17); // X
	create_button('rect', '134,250,157,264', 25); // C
	create_button('rect', '164,250,188,264', 33); // V
	create_button('rect', '195,250,219,264', 41); // B
	create_button('rect', '226,250,250,264', 49); // N
	create_button('rect', '257,250,280,264', 57); // M
	create_button('rect', '288,250,311,264', 65); // THETA
	create_button('rect', '318,250,342,286', 73); // ENTER1 (alphabetic)

	create_button('rect', '72,272,95,286', 1); // diamond
	create_button('rect', '103,272,126,286', 0); // 2nd (lower left) 46,30
	create_button('rect', '134,272,157,286', 24); // STO
	create_button('rect', '164,272,250,286', 32); // SPACE
	create_button('rect', '257,272,280,286', 56); // =
	create_button('rect', '288,272,311,286', 64); // BACKSPACE

	create_button('rect', '58,229,81,235', 74); // A
	create_button('rect', '89,229,112,235', 10); // S
	create_button('rect', '119,229,142,235', 18); // D
	create_button('rect', '150,229,173,235', 26); // F
	create_button('rect', '181,229,204,235', 34); // G
	create_button('rect', '212,229,235,235', 42); // H
	create_button('rect', '243,229,266,235', 50); // J
	create_button('rect', '273,229,296,235', 58); // K
	create_button('rect', '304,229,327,235', 66); // L

	create_button('rect', '349,32,373,56', 0); // 2nd (by cursor pad)
	create_button('rect', '380,32,404,79', 70); // ESC
	create_button('rect', '424,32,459,48', 5); // Up
	create_button('rect', '349,43,373,79', 69); // MODE
	create_button('rect', '411,54,429,85', 4); // Left
	create_button('rect', '455,54,473,85', 6); // Right
	create_button('rect', '349,89,373,105', 61); // CLEAR
	create_button('rect', '424,89,459,105', 7); // Down
	create_button('rect', '349,116,373,130', 53); // LN
	create_button('rect', '380,95,404,130', 62); // APPS
	create_button('rect', '411,113,466,130', 54); // ENTER2 
	create_button('rect', '349,142,373,156', 45); // SIN
	create_button('rect', '380,142,404,156', 46); // COS
	create_button('rect', '411,142,435,156', 47); // TAN
	create_button('rect', '442,142,466,156', 48); // ^
	create_button('rect', '349,167,373,182', 37); // (
	create_button('rect', '380,167,404,182', 38); // )
	create_button('rect', '411,167,435,182', 39); // ,
	create_button('rect', '442,167,466,172', 40); // /
	create_button('rect', '349,191,373,210', 29); // 7
	create_button('rect', '380,191,404,210', 30); // 8
	create_button('rect', '411,191,435,210', 31); // 9
	create_button('rect', '442,191,466,205', 63); // *
	create_button('rect', '349,217,373,235', 21); // 4
	create_button('rect', '380,217,404,235', 22); // 5
	create_button('rect', '411,217,435,235', 23); // 6
	create_button('rect', '442,217,466,231', 72); // -
	create_button('rect', '349,243,373,261', 13); // 1
	create_button('rect', '380,243,404,261', 14); // 2
	create_button('rect', '411,243,435,261', 15); // 3
	create_button('rect', '442,243,466,257', 68); // +
	create_button('rect', '349,268,373,286', 77); // 0
	create_button('rect', '380,268,404,286', 78); // .
	create_button('rect', '411,268,435,286', 79); // (-)
	create_button('rect', '442,268,466,288', 73); // ENTER1 (numeric)

	create_on_button('rect', '41,272,65,286'); // ON: left of DIAMOND, below SHIFT
}

function set_small_89t_skin()
{
	screen_scaling_ratio = 1;

	// Replace image.
	var oldimg = document.getElementById(elementid_calcimg);
	var newimg = document.createElement('img');
	newimg.setAttribute('id', elementid_calcimg);
	newimg.setAttribute('src', 'ti89t_skinmap.gif');
	newimg.setAttribute('usemap', '#' + elementid_calcmap);
	newimg.setAttribute('style', 'position:absolute;top:0px;left:0px;z-index:3');

	oldimg.parentNode.appendChild(newimg);
	newimg.parentNode.removeChild(oldimg);

	// Move canvas.
	var screen = document.getElementById(elementid_screen);
	screen.setAttribute('style', 'position:relative;top:52px;left:33px;z-index:1');
	screen.setAttribute('width', '160');
	screen.setAttribute('height', '100');

	var textandbuttons = document.getElementById(elementid_textandbuttons);
	textandbuttons.setAttribute('style', 'display: none');

	// Scaling radio buttons
	document.getElementById(elementid_smallskin).checked=true;
	document.getElementById(elementid_largeskin).checked=false;

	// Replace map.
	var oldmap = document.getElementById(elementid_calcmap);
	var newmap = document.createElement('map');
	newmap.setAttribute('name', elementid_calcmap);
	newmap.setAttribute('id', elementid_calcmap);

	oldmap.parentNode.appendChild(newmap);
	newmap.parentNode.removeChild(oldmap);

	// Create buttons.
	create_button('rect', '30,175,51,196', 47); // F1
	create_button('rect', '65,177,87,198', 39); // F2
	create_button('rect', '101,178,123,199', 31); // F3
	create_button('rect', '137,177,159,198', 23); // F4
	create_button('rect', '173,175,194,196', 15); // F5

	create_button('rect', '28,220,57,239', 4); // 2ND
	create_button('rect', '62,225,92,243', 5); // SHIFT
	create_button('rect', '97,227,127,244', 48); // ESC

	create_button('rect', '135,225,157,246', 1); // LEFT
	create_button('rect', '181,225,202,246', 3); // RIGHT
	create_button('rect', '157,205,180,235', 0); // UP
	create_button('rect', '157,236,180,267', 2); // DOWN

	create_button('rect', '28,245,57,264', 6); // DIAMOND
	create_button('rect', '60,250,87,268', 7); // ALPHA
	create_button('rect', '97,252,127,269', 40); // APPS

	create_button('rect', '28,270,57,289', 46); // HOME
	create_button('rect', '60,275,87,293', 38); // MODE
	create_button('rect', '97,277,127,294', 30); // CATALOG
	create_button('rect', '132,275,162,293', 22); // BACKSPACE
	create_button('rect', '167,270,197,289', 14); // CLEAR

	create_button('rect', '28,295,57,314', 45); // X
	create_button('rect', '60,300,87,318', 37); // Y
	create_button('rect', '97,302,127,319', 29); // Z
	create_button('rect', '132,300,162,318', 21); // T
	create_button('rect', '167,295,197,314', 13); // ^

	create_button('rect', '28,321,57,340', 44); // =
	create_button('rect', '60,326,87,344', 36); // (
	create_button('rect', '97,328,127,345', 28); // )
	create_button('rect', '132,326,162,344', 20); // ,
	create_button('rect', '167,321,197,340', 12); // /

	create_button('rect', '28,346,57,365', 43); // |
	create_button('rect', '60,351,87,371', 35); // 7
	create_button('rect', '97,353,127,372', 27); // 8
	create_button('rect', '132,351,162,371', 19); // 9
	create_button('rect', '167,346,197,365', 11); // *

	create_button('rect', '28,371,57,390', 42); // EE
	create_button('rect', '60,381,87,401', 34); // 4
	create_button('rect', '97,382,127,401', 26); // 5
	create_button('rect', '132,381,162,401', 18); // 6
	create_button('rect', '167,371,197,390', 10); // -

	create_button('rect', '28,396,57,415', 41); // STO
	create_button('rect', '60,410,87,431', 33); // 1
	create_button('rect', '97,412,127,431', 25); // 2
	create_button('rect', '132,410,162,431', 17); // 3
	create_button('rect', '167,396,197,415', 9); // +

	create_button('rect', '60,440,87,461', 32); // 0
	create_button('rect', '97,442,127,461', 24); // .
	create_button('rect', '132,440,162,461', 16); // (-)
	create_button('rect', '167,421,197,448', 8); // ENTER

	create_on_button('rect', '28,421,57,448'); // ON: below STO.
}

function setCalculatorModel(model)
{
	calculator_model = model;
	if (screen_scaling_ratio == 1) {
		switch (model) {
			case 1: set_skin = set_small_92p_skin; draw_calcscreen = draw_calcscreen_92P_V200; break;
			case 3: set_skin = set_small_89_skin; draw_calcscreen = draw_calcscreen_89_89T; break;
			case 8: set_skin = set_small_v200_skin; draw_calcscreen = draw_calcscreen_92P_V200; break;
			case 9: set_skin = set_small_89t_skin; draw_calcscreen = draw_calcscreen_89_89T; break;
			default: break;
		}
	}
	else {
		switch (model) {
			case 1: set_skin = set_large_92p_skin; draw_calcscreen = draw_calcscreen_92P_V200; break;
			case 3: set_skin = set_small_89_skin; draw_calcscreen = draw_calcscreen_89_89T; break; // TODO
			case 8: set_skin = set_small_v200_skin; draw_calcscreen = draw_calcscreen_92P_V200; break; // TODO
			case 9: set_skin = set_small_89t_skin; draw_calcscreen = draw_calcscreen_89_89T; break; // TODO
			default: break;
		}
	}
}

function reset()
{
	// Reset screen to white.
	for (var p = 0; p < calcscreen.length; calcscreen[p++] = 0x50) {};
}

function setEmu(newemu) {
	emu = newemu;
}

function setLink(newlink) {
	link = newlink;
}

function setSkin(scaling) {
	stdlib.console.log("old scaling ratio: " +  screen_scaling_ratio + "\tnew scaling ratio: " + scaling);
	if (screen_scaling_ratio != scaling) {
		screen_scaling_ratio = scaling;
		setCalculatorModel(calculator_model);
		set_skin();
		initscreen();
	}
}

function initscreen()
{
	var elem = document.getElementById(elementid_screen);
	context = elem.getContext('2d');

	if (screen_scaling_ratio == 1) {
		if (context.createImageData)
			bitmap = context.createImageData(240, 128);
		else if (context.getImageData)
			bitmap = context.getImageData(0, 0, 960, 512);
		else
			bitmap = {'width' : 240, 'height' : 128, 'data' : new Uint8Array(240 * 128 * 4)};
	}
	else if (screen_scaling_ratio == 2) {
		if (context.createImageData)
			bitmap = context.createImageData(480, 256);
		else if (context.getImageData)
			bitmap = context.getImageData(0, 0, 960, 512);
		else
			bitmap = {'width' : 480, 'height' : 256, 'data' : new Uint8Array(480 * 256 * 4)};
	}
	else if (screen_scaling_ratio == 3) {
		if (context.createImageData)
			bitmap = context.createImageData(720, 384);
		else if (context.getImageData)
			bitmap = context.getImageData(0, 0, 960, 512);
		else
			bitmap = {'width' : 720, 'height' : 384, 'data' : new Uint8Array(720 * 384 * 4)};
	}
	else if (screen_scaling_ratio == 4) {
		if (context.createImageData)
			bitmap = context.createImageData(960, 512);
		else if (context.getImageData)
			bitmap = context.getImageData(0, 0, 960, 512);
		else
			bitmap = {'width' : 960, 'height' : 512, 'data' : new Uint8Array(960 * 512 * 4)};
	}

	// set all alpha channels to 255 (fully opaque)
	for (var x = 3; x < bitmap.data.length; x+= 4) bitmap.data[x] = 255;
}

function initemu() {
	// Check integration into the HTML DOM.
	if (   !document.getElementById(elementid_calcmap)
	    || !document.getElementById(elementid_calcimg)
	    || !document.getElementById(elementid_screen)
	    || !document.getElementById(elementid_pngimage)) {
		
	}
	if (   !document.getElementById(elementid_smallskin)
	    || !document.getElementById(elementid_largeskin)
	    || !document.getElementById(elementid_textandbuttons)
	    || !document.getElementById(elementid_pngbutton)
	    || !document.getElementById(elementid_hidebutton)
	    || !document.getElementById(elementid_pauseemulator)
	    || !document.getElementById(elementid_resumeemulator)
	    || !document.getElementById(elementid_speedup)
	    || !document.getElementById(elementid_slowdown)
	    || !document.getElementById(elementid_downloadfile)) {
		
	}
	// Not checking for area, romfile.

	set_skin();
	initscreen();
}

function getPNG()
{
	var data = document.getElementById(elementid_screen).toDataURL('image/png');
	document.getElementById(elementid_pngimage).src = data;
	document.getElementById(elementid_pngbutton).style.display='none';
	document.getElementById(elementid_pngimage).style.display='inline';
	document.getElementById(elementid_hidebutton).style.display='inline';
}

function pngButtons()
{
	document.getElementById(elementid_pngimage).style.display='none';
	document.getElementById(elementid_hidebutton).style.display='none';
	document.getElementById(elementid_pngbutton).style.display='inline';
}

function pause_emulator()
{
	//emu.pause_emulator();
	//document.getElementById(elementid_pauseemulator).style.display='none';
	//document.getElementById(elementid_resumeemulator).style.display='inline';
}

function resume_emulator()
{
	emu.resume_emulator();
	document.getElementById(elementid_pauseemulator).style.display='inline';
	document.getElementById(elementid_resumeemulator).style.display='none';
}

function loadrom()
{
	var infile = document.getElementById(elementid_romfile).files[0];
	emu.loadrom(infile);
}

function set_title(title)
{
	document.title = title;
}

function getFileData(blob)
{
	// http://stackoverflow.com/a/16213045
	var url = stdlib.URL.createObjectURL(blob);
	var a = document.querySelector("#" + elementid_downloadfile);
	a.href = url;
	a.download = link.link_recv_foldername() + "." + link.link_recv_varname() + link.buildFileExtensionFromVartype();
	a.style.display='inline';
}

function set_colors_according_to_contrast()
{
	if (emu.hardware_model() == 1) {
		// TODO: modify both black_color and white_color.
		//black_color = white_color - 5 * contrast;
	}
	else {
		// TODO: modify both black_color and white_color.
		//black_color = (2 * white_color - 5 * contrast) >> 1;
	}
}

function set_screen_enabled_and_contrast(calculator_model, hardware_model, port_60001C, port_60001D, port_70001D, port_70001F)
{
	//stdlib.console.log(emu.to_hex(port_60001D, 2));
	if (hardware_model == 1) {
		var new_screen_enabled = ((port_60001D & 0x10) == 0x00) || ((port_60001C & 0x3C) != 0x3C); // Bit 4 of 60001D clear, or not all bits set in LCD RS frequency.
		if (new_screen_enabled ^ screen_enabled) {
			stdlib.console.log("Changing screen state: " + new_screen_enabled + "\tpc=" + emu.to_hex(emu.pc(), 6) + "\thardware_model=" + hardware_model + "\t60001C=" + emu.to_hex(port_60001C, 2) + "\t60001D=" + emu.to_hex(port_60001D, 2) + "\t70001D=" + emu.to_hex(port_70001D, 2) + "\t70001F=" + emu.to_hex(port_70001F, 2));
		}
		screen_enabled = new_screen_enabled;
		// LCD contrast level on 4 bits
		port_60001D &= 0x0F;
		if (calculator_model == 1 || calculator_model == 8) { // 92+ & V200
			port_60001D = 0x10 - port_60001D;
		}
		contrast = port_60001D;

		set_colors_according_to_contrast();
	}
	else {
		var new_screen_enabled = ((port_70001D & 0x2) == 0x2) || ((port_60001C & 0x3C) != 0x3C); // Bit 1 of 70001D set, or not all bits set in LCD RS frequency.
		if (new_screen_enabled ^ screen_enabled) {
			stdlib.console.log("Changing screen state: " + new_screen_enabled + "\tpc=" + emu.to_hex(emu.pc(), 6) + "\thardware_model=" + hardware_model + "\t60001C=" + emu.to_hex(port_60001C, 2) + "\t60001D=" + emu.to_hex(port_60001D, 2) + "\t70001D=" + emu.to_hex(port_70001D, 2) + "\t70001F=" + emu.to_hex(port_70001F, 2));
		}
		screen_enabled = new_screen_enabled;
		// LCD contrast level on 5 bits, unless bit 0 of port 70001F is clear
		port_60001D &= (port_70001F & 1) ? 0x1F : 0x0F;
		if (calculator_model == 1 || calculator_model == 8) { // 92+ & V200
			port_60001D = ((port_70001F & 1) ? 0x20 : 0x10) - port_60001D;
		}
		contrast = port_60001D;

		set_colors_according_to_contrast();
	}
}

function set_frames_for_averaging(frames) {
	if (frames == 3 || frames == 6) {
		frames_for_averaging = frames;
		calcscreen = new Uint8Array(240 * 128 * frames_for_averaging);
		frame = 0;
		white_color = (0x50 / (frames_for_averaging / 3));
		set_colors_according_to_contrast();
		reset();
	}
	else {
		stdlib.console.warn("Unsupported number of frames for averaging");
	}
}

function set_white_color(color) { white_color = color; }
function set_black_color(color) { black_color = color; }

function set_elementid_calcmap(calcmap) { elementid_calcmap = calcmap; }
function set_elementid_area(area) { elementid_area = area; }
function set_elementid_calcimg(calcimg) { elementid_calcimg = calcimg; }
function set_elementid_screen(screen) { elementid_screen = screen; }
function set_elementid_smallskin(smallskin) { elementid_smallskin = smallskin; }
function set_elementid_largeskin(largeskin) { elementid_largeskin = largeskin; }
function set_elementid_textandbuttons(textandbuttons) { elementid_textandbuttons = textandbuttons; }
function set_elementid_pngimage(pngimage) { elementid_pngimage = pngimage; }
function set_elementid_pngbutton(pngbutton) { elementid_pngbutton = pngbutton; }
function set_elementid_hidebutton(hidebutton) { elementid_hidebutton = hidebutton; }
function set_elementid_pauseemulator(pauseemulator) { elementid_pauseemulator = pauseemulator; }
function set_elementid_resumeemulator(resumeemulator) { elementid_resumeemulator = resumeemulator; }
function set_elementid_speedup(speedup) { elementid_speedup = speedup; }
function set_elementid_slowdown(slowdown) { elementid_slowdown = slowdown; }
function set_elementid_romfile(romfile) { elementid_romfile = romfile; }
function set_elementid_downloadfile(downloadfile) { elementid_downloadfile = downloadfile; }
function set_display_no_rom_loaded(func) { display_no_rom_loaded = func; }

return {
	// Functions called directly from events on elements in the HTML page
	setSkin : setSkin,
	getPNG : getPNG,
	loadrom : loadrom,
	pngButtons : pngButtons,
	pause_emulator : pause_emulator,
	resume_emulator : resume_emulator,

	// Setter functions called from the core
	setCalculatorModel : setCalculatorModel,
	initkeyhandlers : initkeyhandlers,
	reset : reset,
	initemu : initemu,
	initscreen : initscreen,
	draw_screen : draw_screen,
	set_screen_enabled_and_contrast : set_screen_enabled_and_contrast,
	set_title : set_title,
	getFileData : getFileData,
	display_no_rom_loaded : display_no_rom_loaded, 

	// Setter functions called from a script in the HTML page.
	setEmu : setEmu,
	setLink : setLink,

	// Setter functions for document element IDs, optionally called from a script in the HTML page.
	set_elementid_calcmap : set_elementid_calcmap,
	set_elementid_area : set_elementid_area,
	set_elementid_calcimg : set_elementid_calcimg,
	set_elementid_screen : set_elementid_screen,
	set_elementid_smallskin : set_elementid_smallskin,
	set_elementid_largeskin : set_elementid_largeskin,
	set_elementid_textandbuttons : set_elementid_textandbuttons,
	set_elementid_pngimage : set_elementid_pngimage,
	set_elementid_pngbutton : set_elementid_pngbutton,
	set_elementid_hidebutton : set_elementid_hidebutton,
	set_elementid_pauseemulator : set_elementid_pauseemulator,
	set_elementid_resumeemulator : set_elementid_resumeemulator,
	set_elementid_speedup : set_elementid_speedup,
	set_elementid_slowdown : set_elementid_slowdown,
	set_elementid_romfile : set_elementid_romfile,
	set_display_no_rom_loaded : set_display_no_rom_loaded,

	set_frames_for_averaging : set_frames_for_averaging,
	set_white_color : set_white_color,
	set_black_color : set_black_color,

	_save_state : _save_state,
	_restore_state : _restore_state

};

}
