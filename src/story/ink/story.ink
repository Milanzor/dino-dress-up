// ─────────────────────────────────────────────────────────────────────────────
// Dino Dagje Uit — full narrative (one day in Zonnig Dal → Het Grote Dino Feest).
//
// Pre-readers (ages 3–5) never SEE this text. All runtime meaning is carried by
// the TAGS on each line; StoryEngine ignores the visible Dutch (kept short, just
// for debugging) and reads the tags to drive the 3D scene + Dutch narration.
//
// Beat tags (on a narration line):  # scene:<id>  # narrate:<clip>  # ambient:<clip>
// Choice tags (INSIDE the [] only): # icon:<id>   # audio:<clip>
// Ending tag (on the final line):   # ending:<id>
//
// One narrate clip lives on its own line so StoryEngine yields it as a single
// Beat; successive beats are surfaced across successive next() calls.
// ─────────────────────────────────────────────────────────────────────────────

VAR outfit = ""
VAR breakfast = ""
VAR firstPath = ""
VAR metTrix = 0
VAR metBronto = 0
VAR metPtera = 0
VAR pipAlong = 0
VAR kindness = 0
VAR courage = 0
VAR crystalColor = ""
VAR act = ""
VAR wakeup = ""

-> nest

// === Chapter 1: Thuis (scene nest) — wake up, breakfast, get dressed =========
=== nest ===
Hoog in de boom wordt Dino wakker in het nest. # scene:nest # narrate:nest_intro # ambient:ambient_home
* [Rek je lekker uit # icon:stretch # audio:choice_stretch]
    ~ wakeup = "stretch"
    -> nest_breakfast
* [Stuiter uit bed # icon:bounce # audio:choice_bounce]
    ~ wakeup = "bounce"
    -> nest_breakfast
* [Gaap eens flink # icon:yawn # audio:choice_yawn]
    ~ wakeup = "yawn"
    -> nest_breakfast

= nest_breakfast
Eerst lekker ontbijten. Wat eet Dino? # narrate:nest_breakfast
* [Sappige bessen # icon:bessen # audio:choice_bessen]
    ~ breakfast = "bessen"
    -> nest_dress
* [Knapperig groen # icon:groen # audio:choice_groen]
    ~ breakfast = "groen"
    -> nest_dress
* [Krokante zaden # icon:zaden # audio:choice_zaden]
    ~ breakfast = "zaden"
    -> nest_dress

= nest_dress
Tijd om je aan te kleden voor het feest! # narrate:nest_dress
* [Zet de zonnehoed op # icon:hat # audio:choice_sunhat]
    ~ outfit = "zonnehoed"
    -> wereld
* [Doe de regencape om # icon:cape # audio:choice_raincape]
    ~ outfit = "regencape"
    -> wereld
* [Neem de rugzak mee # icon:rugzak # audio:choice_rugzak]
    ~ outfit = "rugzak"
    -> wereld
* [Zet de feestkroon op # icon:crown # audio:choice_crown]
    ~ outfit = "feestkroon"
    -> wereld

// === Chapter 2: De Wijde Wereld In (scene wereld) — goodbye + the fork =======
=== wereld ===
Buiten lacht de zon. Tijd om gedag te zeggen. # scene:wereld # narrate:wereld_intro # ambient:ambient_meadow
* [Knuffel mama # icon:mama # audio:choice_mama]
    -> wereld_fork
* [Knuffel papa # icon:papa # audio:choice_papa]
    -> wereld_fork
* [Neem broertje Pip mee # icon:pip # audio:choice_pip]
    ~ pipAlong = 1
    -> wereld_fork

= wereld_fork
Het pad splitst zich. Waar gaan we eerst heen? # narrate:wereld_fork
* [Eerst naar de bloemenwei # icon:meadow # audio:choice_meadow]
    ~ firstPath = "meadow"
    -> wei
* [Eerst naar de rivier # icon:river # audio:choice_river]
    ~ firstPath = "river"
    -> rivier

// === Chapter 3: Bloemenwei (scene wei) — help Trix + the shell ===============
=== wei ===
In de bloemenwei zoekt Trix haar stuiterbal. Help je mee? # scene:wei # narrate:wei_intro # ambient:ambient_meadow
* [Zoek samen in het gras # icon:search # audio:choice_search]
    -> wei_found
* [Vraag het de vlinders # icon:butterfly # audio:choice_butterfly]
    -> wei_found
* [Lok haar met een snoepje # icon:snack # audio:choice_snack]
    -> wei_found

= wei_found
Hoera, de bal is terug! Trix gaat mee naar het feest. # narrate:wei_found
~ metTrix = 1
~ kindness = kindness + 1
-> wei_shell

= wei_shell
In het gras glinstert een mooie schelp. # narrate:wei_shell
* [Hou de schelp zelf # icon:shell # audio:choice_keep]
    -> wei_done
* [Geef de schelp aan een klein dino'tje # icon:share # audio:choice_share]
    ~ kindness = kindness + 1
    -> wei_done

= wei_done
Wat een fijne wei! Verder gaat de tocht. # narrate:wei_done
{ firstPath == "meadow":
    -> rivier
- else:
    -> bos
}

// === Chapter 4: Rivier (scene rivier) — crossing + baby Ptera ================
=== rivier ===
Een brede, klaterende rivier blokkeert het pad. # scene:rivier # narrate:rivier_intro # ambient:ambient_river
* [Spring over de stapstenen # icon:stones # audio:choice_stones]
    -> rivier_crossed
* [Loop over de boomstam # icon:log # audio:choice_log]
    -> rivier_crossed
* [Vraag de grote Bronto om een lift # icon:bronto # audio:choice_bronto]
    -> rivier_crossed

= rivier_crossed
Aan de overkant lacht Bronto. Bronto gaat mee! # narrate:rivier_cross
~ metBronto = 1
~ courage = courage + 1
-> rivier_ptera

= rivier_ptera
Baby Ptera kan haar nestje niet bereiken. Help je haar? # narrate:rivier_ptera
* [Bouw een lieve hellingbaan # icon:ramp # audio:choice_ramp]
    -> rivier_ptera_done
* [Roep de grote dino's erbij # icon:call # audio:choice_call]
    -> rivier_ptera_done
* [Draag haar op je rug omhoog # icon:ptera # audio:choice_carry]
    -> rivier_ptera_done

= rivier_ptera_done
Veilig in het nest! Ptera tjilpt blij en gaat mee. # narrate:rivier_ptera_done
~ metPtera = 1
~ courage = courage + 1
{ firstPath == "river":
    -> wei
- else:
    -> bos
}

// === Chapter 5: Fluisterbos (scene bos) + Glittergrotten (scene grot) ========
=== bos ===
Het Fluisterbos ruist zachtjes. Knus, hoor. # scene:bos # narrate:bos_intro # ambient:ambient_forest
* [Hou een pootje vast # icon:paw # audio:choice_paw]
    -> bos_done
* [Neurie een dapper liedje # icon:hum # audio:choice_hum]
    -> bos_done
* [Steek een glimpaddenstoel-lantaarn aan # icon:lantern # audio:choice_lantern]
    -> bos_done

= bos_done
Wat een dappere wandeling! # narrate:bos_done
~ courage = courage + 1
-> grot

=== grot ===
De Glittergrotten fonkelen vol kristallen. # scene:grot # narrate:grot_intro # ambient:ambient_cave
* [Kies een roze kristal # icon:crystal # audio:choice_crystal_pink]
    ~ crystalColor = "roze"
    -> grot_done
* [Kies een blauw kristal # icon:crystal # audio:choice_crystal_blue]
    ~ crystalColor = "blauw"
    -> grot_done
* [Kies een geel kristal # icon:crystal # audio:choice_crystal_yellow]
    ~ crystalColor = "geel"
    -> grot_done

= grot_done
Een glinsterend kristal voor in je zak! # narrate:grot_done
-> regen

// === Chapter 6: De Verrassing (scene regen) — sudden rain ====================
=== regen ===
Plots begint het te regenen! Pitter-patter. # scene:regen # narrate:regen_intro # ambient:ambient_rain
{ outfit == "regencape":
    -> regen_cozy
- else:
    -> regen_umbrella
}

= regen_cozy
Lekker droog in je regencape. # narrate:regen_cozy
-> regen_choice

= regen_umbrella
Een vriendje deelt zijn paraplu met je. Wat lief! # narrate:regen_umbrella
~ kindness = kindness + 1
-> regen_choice

= regen_choice
Wat doen jullie samen in de regen? # narrate:regen_prompt
* [Kruip dicht tegen elkaar # icon:huddle # audio:choice_huddle]
    -> regen_done
* [Deel een lekker snoepje # icon:snack # audio:choice_rainsnack]
    -> regen_done
* [Zing een vrolijk regenlied # icon:song # audio:choice_rainsong]
    -> regen_done

= regen_done
Samen is regen juist gezellig! # narrate:regen_done
~ kindness = kindness + 1
-> klaar

// === Chapter 7: Klaarmaken (scene klaar) — pick your act =====================
=== klaar ===
Bijna feest! Wat ga jij doen op het podium? # scene:klaar # narrate:klaar_intro # ambient:ambient_festival
* [Een vrolijke dans # icon:dans # audio:choice_dans]
    ~ act = "dans"
    -> klaar_done
* [Een mooi liedje zingen # icon:zang # audio:choice_zang]
    ~ act = "zang"
    -> klaar_done
* [Een glitter-modeshow # icon:mode # audio:choice_mode]
    ~ act = "mode"
    -> klaar_done
* [Vertel over al je vrienden # icon:vrienden # audio:choice_vrienden]
    ~ act = "vrienden"
    -> klaar_done

= klaar_done
Klaar voor de show! # narrate:klaar_done
-> festival

// === Chapter 8: Het Grote Dino Feest (scene festival) — perform + ending =====
=== festival ===
Op het Grote Dino Feest is iedereen vrolijk. # scene:festival # narrate:festival_intro # ambient:ambient_festival
-> festival_perform

= festival_perform
{
    - act == "dans":
        -> perform_dans
    - act == "zang":
        -> perform_zang
    - act == "mode":
        -> perform_mode
    - else:
        -> perform_vrienden
}

= perform_dans
Dino danst en iedereen klapt mee! # narrate:festival_dans
-> festival_ending

= perform_zang
Dino zingt het mooiste liedje. # narrate:festival_zang
-> festival_ending

= perform_mode
Dino showt de allermooiste outfit. # narrate:festival_mode
-> festival_ending

= perform_vrienden
Dino vertelt trots over alle nieuwe vrienden. # narrate:festival_vrienden
-> festival_ending

= festival_ending
{
    - pipAlong == 1 and metTrix + metBronto + metPtera >= 3:
        -> ending_vriendschap
    - kindness > courage:
        -> ending_liefzijn
    - courage > kindness:
        -> ending_ontdekker
    - else:
        -> ending_modester
}

= ending_vriendschap
Wat een groot vriendschapsfeest met iedereen erbij! Het einde. # narrate:ending_vriendschap # ending:vriendschap
-> END

= ending_liefzijn
Jij bent de Lief-zijn-Kampioen van Zonnig Dal! Het einde. # narrate:ending_liefzijn # ending:liefzijn
-> END

= ending_ontdekker
Jij bent de Dappere Ontdekker van vandaag! Het einde. # narrate:ending_ontdekker # ending:ontdekker
-> END

= ending_modester
Wat een vrolijke feestdag, kleine modester! Het einde. # narrate:ending_modester # ending:modester
-> END
