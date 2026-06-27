// ─────────────────────────────────────────────────────────────────────────────
// Dino Dagje Uit — vertical-slice narrative.
//
// Pre-readers (ages 3–5) never SEE this text. All runtime meaning is carried by
// the TAGS on each line; StoryEngine ignores the visible Dutch (kept short, just
// for debugging) and reads the tags to drive the 3D scene + Dutch narration.
//
// Beat tags (on a narration line):  # scene:<id>  # narrate:<clip>  # ambient:<clip>
// Choice tags (on a choice line):   # icon:<id>   # audio:<clip>
// Ending tag (on the final line):   # ending:<id>
//
// One narrate clip lives on its own line so StoryEngine yields it as a single
// Beat; successive beats are surfaced across successive next() calls.
// ─────────────────────────────────────────────────────────────────────────────

VAR outfit = ""
VAR path = ""
VAR friend = ""
VAR kindness = 0
VAR courage = 0

-> nest

// === Beat 1: the nest — wake up and get dressed ===========================
=== nest ===
Hoog in de boom wordt Dino wakker in het nest. # scene:nest # narrate:nest_intro # ambient:ambient_home
* [Zet de zonnehoed op # icon:hat # audio:choice_sunhat]
    ~ outfit = "sunhat"
    -> nest_done
* [Doe de regencape om # icon:cape # audio:choice_raincape]
    ~ outfit = "raincape"
    -> nest_done
* [Zet het kroontje op # icon:crown # audio:choice_crown]
    ~ outfit = "crown"
    -> nest_done

= nest_done
Mooi aangekleed klimt Dino het nest uit. # narrate:nest_done
-> fork

// === Beat 2: the fork — choose a direction ================================
=== fork ===
Het pad splitst zich in tweeën. # scene:fork # narrate:fork_intro
* [Ga naar de weide # icon:meadow # audio:choice_meadow]
    ~ path = "meadow"
    -> meadow
* [Ga naar de rivier # icon:river # audio:choice_river]
    ~ path = "river"
    -> river

// === Beat 3a: the meadow — help Trix (kindness) ===========================
=== meadow ===
In de zonnige weide zit Trix te huilen. # scene:meadow # narrate:meadow_intro # ambient:ambient_meadow
* [Zoek samen in het gras # icon:search # audio:choice_search]
    -> meadow_found
* [Lok de vlinders # icon:butterfly # audio:choice_butterfly]
    -> meadow_found

= meadow_found
Samen vinden ze de weg terug. Trix is nu een vriend. # narrate:meadow_found
~ friend = "trix"
~ kindness = kindness + 1
-> festival

// === Beat 3b: the river — cross over (courage) ============================
=== river ===
Een brede, klaterende rivier blokkeert het pad. # scene:river # narrate:river_intro # ambient:ambient_river
* [Spring over de stenen # icon:stones # audio:choice_stones]
    -> river_cross
* [Rijd mee op Bronto # icon:bronto # audio:choice_bronto]
    -> river_cross

= river_cross
Aan de overkant lacht Bronto. Bronto is nu een vriend. # narrate:river_cross
~ friend = "bronto"
~ courage = courage + 1
-> festival

// === Beat 4: the festival — ending chosen by accumulated choices ==========
=== festival ===
Op het grote dinofeest is iedereen vrolijk. # scene:festival # narrate:festival_intro # ambient:ambient_festival
{ kindness > courage:
    -> ending_vriendschap
- else:
    -> ending_avontuur
}

= ending_vriendschap
Wat een dag vol vriendschap! # narrate:ending_vriendschap # ending:vriendschap
-> END

= ending_avontuur
Wat een dag vol avontuur! # narrate:ending_avontuur # ending:avontuur
-> END
