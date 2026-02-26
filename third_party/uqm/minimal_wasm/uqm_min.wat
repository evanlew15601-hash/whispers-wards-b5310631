(; Copyright Paul Reiche, Fred Ford. 1992-2002

   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
;)

(; 
  Minimal UQM-derived WebAssembly module.

  Derived-from reference:
    third_party/uqm/sc2/src/uqm/comm.c

  This WAT module implements a small, self-contained subset of the logic of
  getLineWithinWidth() in a simplified monospace model.

  It also implements a minimal conversation state machine API. The conversation
  functions are newly written, but this module remains GPL-licensed due to its
  UQM-derived lineage.

  Exports:
    - memory
    - uqm_alloc (bump allocator)
    - uqm_version_ptr / uqm_version_len
    - uqm_line_fit_chars(ptr, maxWidth) -> number of characters that fit
      in maxWidth columns without breaking a word.
    - uqm_conv_* conversation API (see uqm_min.c for layout details)
;)

(module
  (memory (export "memory") 2)

  ;; Bump allocator pointer (byte offset)
  (global $heap_ptr (mut i32) (i32.const 8192))

  ;; Conversation state
  (global $conv_currentNode (mut i32) (i32.const 0))
  (global $conv_rep0 (mut i32) (i32.const 0))
  (global $conv_rep1 (mut i32) (i32.const 0))
  (global $conv_rep2 (mut i32) (i32.const 0))
  (global $conv_secrets (mut i32) (i32.const 0))

  ;; Graph pointers
  (global $graph_nodes (mut i32) (i32.const 0))
  (global $graph_choices (mut i32) (i32.const 0))

  (data (i32.const 1024) "UQM minimal wasm (derived from comm.c)")

  (func (export "uqm_version_ptr") (result i32)
    (i32.const 1024)
  )

  (func (export "uqm_version_len") (result i32)
    ;; length of the string above (no null terminator)
    (i32.const 38)
  )

  ;; uint32_t uqm_alloc(uint32_t size)
  (func (export "uqm_alloc") (param $size i32) (result i32)
    (local $p i32)
    (local.set $p (global.get $heap_ptr))

    ;; heap_ptr = align8(heap_ptr + size)
    (global.set $heap_ptr
      (i32.and
        (i32.add
          (i32.add (local.get $p) (local.get $size))
          (i32.const 7)
        )
        (i32.const -8)
      )
    )

    (local.get $p)
  )

  ;; Helper: load byte at ptr
  (func $load8 (param $p i32) (result i32)
    (i32.load8_u (local.get $p))
  )

  ;; uint32_t uqm_line_fit_chars(const char* str, uint32_t maxWidth)
  (func (export "uqm_line_fit_chars") (param $str i32) (param $maxWidth i32) (result i32)
    (local $p i32)
    (local $count i32)
    (local $wordStart i32)
    (local $wordLen i32)
    (local $c i32)
    (local $tentative i32)

    (local.set $p (local.get $str))
    (local.set $count (i32.const 0))

    (block $done
      (loop $outer
        ;; Start scanning next word
        (local.set $wordStart (local.get $p))
        (local.set $wordLen (i32.const 0))

        ;; Scan a word (until space/newline/NUL)
        (block $wordBreak
          (loop $scan
            (local.set $c (call $load8 (local.get $p)))

            ;; End-of-string or newline => return count + wordLen (if fits)
            (if (i32.eqz (local.get $c))
              (then (br $wordBreak))
            )
            (if (i32.eq (local.get $c) (i32.const 10))
              (then (br $wordBreak))
            )
            (if (i32.eq (local.get $c) (i32.const 13))
              (then (br $wordBreak))
            )

            ;; Space ends word
            (if (i32.eq (local.get $c) (i32.const 32))
              (then (br $wordBreak))
            )

            ;; Consume char
            (local.set $p (i32.add (local.get $p) (i32.const 1)))
            (local.set $wordLen (i32.add (local.get $wordLen) (i32.const 1)))
            (br $scan)
          )
        )

        ;; tentative = count + wordLen
        (local.set $tentative (i32.add (local.get $count) (local.get $wordLen)))

        ;; If tentative width >= maxWidth, do not include this word.
        (if (i32.ge_u (local.get $tentative) (local.get $maxWidth))
          (then (return (local.get $count)))
        )

        ;; Accept this word
        (local.set $count (local.get $tentative))

        ;; Check terminator/newline/CR after word scan
        (local.set $c (call $load8 (local.get $p)))
        (if (i32.eqz (local.get $c))
          (then (return (local.get $tentative)))
        )
        (if (i32.eq (local.get $c) (i32.const 10))
          (then (return (local.get $tentative)))
        )
        (if (i32.eq (local.get $c) (i32.const 13))
          (then (return (local.get $tentative)))
        )

        ;; If we ended on a space, include it as inter-word spacing (if it fits).
        (if (i32.eq (local.get $c) (i32.const 32))
          (then
            ;; include the space
            (local.set $tentative (i32.add (local.get $tentative) (i32.const 1)))
            (if (i32.ge_u (local.get $tentative) (local.get $maxWidth))
              (then (return (local.get $count)))
            )
            (local.set $count (local.get $tentative))
            (local.set $p (i32.add (local.get $p) (i32.const 1)))
            (br $outer)
          )
        )

        ;; Fallback: unknown delimiter, stop
        (return (local.get $tentative))
      )
    )

    (local.get $count)
  )

  (func $conv_node_meta_ptr (result i32)
    (local $nodes i32)
    (local $nodeCount i32)
    (local $idx i32)

    (local.set $nodes (global.get $graph_nodes))
    (if (i32.eqz (local.get $nodes))
      (then (return (i32.const 0)))
    )

    (local.set $idx (global.get $conv_currentNode))
    (if (i32.lt_s (local.get $idx) (i32.const 0))
      (then (return (i32.const 0)))
    )

    (local.set $nodeCount (i32.load (local.get $nodes)))
    (if (i32.ge_u (local.get $idx) (local.get $nodeCount))
      (then (return (i32.const 0)))
    )

    (i32.add
      (i32.add (local.get $nodes) (i32.const 8))
      (i32.mul (local.get $idx) (i32.const 8))
    )
  )

  (func (export "uqm_conv_reset")
    (param $startNode i32) (param $rep0 i32) (param $rep1 i32) (param $rep2 i32) (param $secrets i32)
    (global.set $conv_currentNode (local.get $startNode))
    (global.set $conv_rep0 (local.get $rep0))
    (global.set $conv_rep1 (local.get $rep1))
    (global.set $conv_rep2 (local.get $rep2))
    (global.set $conv_secrets (local.get $secrets))
  )

  (func (export "uqm_conv_set_graph") (param $nodesPtr i32) (param $choicesPtr i32)
    (global.set $graph_nodes (local.get $nodesPtr))
    (global.set $graph_choices (local.get $choicesPtr))
  )

  (func (export "uqm_conv_get_current_node") (result i32)
    (global.get $conv_currentNode)
  )

  (func (export "uqm_conv_get_rep") (param $idx i32) (result i32)
    (if (i32.eq (local.get $idx) (i32.const 0))
      (then (return (global.get $conv_rep0)))
    )
    (if (i32.eq (local.get $idx) (i32.const 1))
      (then (return (global.get $conv_rep1)))
    )
    (if (i32.eq (local.get $idx) (i32.const 2))
      (then (return (global.get $conv_rep2)))
    )
    (i32.const 0)
  )

  (func (export "uqm_conv_get_secrets") (result i32)
    (global.get $conv_secrets)
  )

  (func $uqm_conv_get_choice_count (export "uqm_conv_get_choice_count") (result i32)
    (local $nodePtr i32)
    (local.set $nodePtr (call $conv_node_meta_ptr))
    (if (i32.eqz (local.get $nodePtr))
      (then (return (i32.const 0)))
    )
    (i32.load offset=4 (local.get $nodePtr))
  )

  (func $uqm_conv_choice_is_locked (export "uqm_conv_choice_is_locked") (param $localIdx i32) (result i32)
    (local $nodePtr i32)
    (local $choicesBase i32)
    (local $firstChoice i32)
    (local $choiceCount i32)
    (local $absChoice i32)
    (local $totalChoices i32)
    (local $choicePtr i32)
    (local $reqFaction i32)
    (local $reqMin i32)
    (local $rep i32)

    (local.set $nodePtr (call $conv_node_meta_ptr))
    (if (i32.eqz (local.get $nodePtr))
      (then (return (i32.const 1)))
    )

    (local.set $choicesBase (global.get $graph_choices))
    (if (i32.eqz (local.get $choicesBase))
      (then (return (i32.const 1)))
    )

    (local.set $firstChoice (i32.load (local.get $nodePtr)))
    (local.set $choiceCount (i32.load offset=4 (local.get $nodePtr)))

    (if (i32.ge_u (local.get $localIdx) (local.get $choiceCount))
      (then (return (i32.const 1)))
    )

    (local.set $absChoice (i32.add (local.get $firstChoice) (local.get $localIdx)))

    (local.set $totalChoices (i32.load offset=4 (global.get $graph_nodes)))
    (if (i32.ge_u (local.get $absChoice) (local.get $totalChoices))
      (then (return (i32.const 1)))
    )

    (local.set $choicePtr (i32.add (local.get $choicesBase) (i32.mul (local.get $absChoice) (i32.const 18))))

    (local.set $reqFaction (i32.load16_s offset=10 (local.get $choicePtr)))
    (local.set $reqMin (i32.load16_s offset=12 (local.get $choicePtr)))

    (if (i32.lt_s (local.get $reqFaction) (i32.const 0))
      (then (return (i32.const 0)))
    )

    (local.set $rep (i32.const 0))
    (if (i32.eq (local.get $reqFaction) (i32.const 0))
      (then (local.set $rep (global.get $conv_rep0)))
      (else
        (if (i32.eq (local.get $reqFaction) (i32.const 1))
          (then (local.set $rep (global.get $conv_rep1)))
          (else
            (if (i32.eq (local.get $reqFaction) (i32.const 2))
              (then (local.set $rep (global.get $conv_rep2)))
              (else (return (i32.const 1)))
            )
          )
        )
      )
    )

    (if (i32.lt_s (local.get $rep) (local.get $reqMin))
      (then (return (i32.const 1)))
    )

    (i32.const 0)
  )

  (func (export "uqm_conv_choose") (param $localIdx i32) (result i32)
    (local $nodePtr i32)
    (local $choicesBase i32)
    (local $firstChoice i32)
    (local $absChoice i32)
    (local $totalChoices i32)
    (local $choicePtr i32)
    (local $nextNode i32)
    (local $d0 i32)
    (local $d1 i32)
    (local $d2 i32)
    (local $reveal i32)

    (if (call $uqm_conv_choice_is_locked (local.get $localIdx))
      (then (return (i32.const -1)))
    )

    (local.set $nodePtr (call $conv_node_meta_ptr))
    (local.set $choicesBase (global.get $graph_choices))
    (local.set $firstChoice (i32.load (local.get $nodePtr)))

    (local.set $absChoice (i32.add (local.get $firstChoice) (local.get $localIdx)))

    (local.set $totalChoices (i32.load offset=4 (global.get $graph_nodes)))
    (if (i32.ge_u (local.get $absChoice) (local.get $totalChoices))
      (then (return (i32.const -1)))
    )

    (local.set $choicePtr (i32.add (local.get $choicesBase) (i32.mul (local.get $absChoice) (i32.const 18))))

    (local.set $nextNode (i32.load (local.get $choicePtr)))
    (local.set $d0 (i32.load16_s offset=4 (local.get $choicePtr)))
    (local.set $d1 (i32.load16_s offset=6 (local.get $choicePtr)))
    (local.set $d2 (i32.load16_s offset=8 (local.get $choicePtr)))
    (local.set $reveal (i32.load offset=14 (local.get $choicePtr)))

    (global.set $conv_rep0 (i32.add (global.get $conv_rep0) (local.get $d0)))
    (global.set $conv_rep1 (i32.add (global.get $conv_rep1) (local.get $d1)))
    (global.set $conv_rep2 (i32.add (global.get $conv_rep2) (local.get $d2)))
    (global.set $conv_secrets (i32.or (global.get $conv_secrets) (local.get $reveal)))

    (global.set $conv_currentNode (local.get $nextNode))
    (local.get $nextNode)
  )
)
