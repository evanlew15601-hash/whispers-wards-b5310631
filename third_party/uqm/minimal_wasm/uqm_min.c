//Copyright Paul Reiche, Fred Ford. 1992-2002

/*
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */

/*
 * Minimal UQM-derived WebAssembly compilation unit.
 *
 * This file includes code derived from:
 *   third_party/uqm/sc2/src/uqm/comm.c
 *
 * Specifically, it includes a lightly-adapted version of:
 *   BOOLEAN getLineWithinWidth(TEXT *pText, const char **startNext,
 *         SIZE maxWidth, COUNT maxChars);
 *
 * Changes from upstream:
 * - Replaced UQM engine dependencies (graphics/font metrics, UTF-8 helpers)
 *   with tiny stubs that treat width in monospace "character columns".
 * - Added a tiny bump allocator and version string exports so JS can call
 *   into this module in-browser.
 * - Added a minimal conversation state machine API.
 *
 * Note: The conversation functions added below are newly written for this
 * project, but they live inside this GPL-licensed, UQM-derived file and are
 * therefore distributed under the same GPL terms.
 */

#include <stdint.h>
#include <stddef.h>

typedef uint32_t COUNT;
typedef int32_t SIZE;
typedef int BOOLEAN;
typedef uint32_t UniChar;

typedef struct
{
	struct { int32_t x, y; } corner;
	struct { uint32_t width, height; } extent;
} RECT;

typedef struct
{
	const char *pStr;
	COUNT CharCount;
} TEXT;

static UniChar
getCharFromString (const char **pptr)
{
	unsigned char c = (unsigned char) **pptr;
	if (c == '\0')
		return 0;
	(*pptr)++;
	return (UniChar) c;
}

static void
TextRect (TEXT *pText, RECT *rect, void *unused)
{
	rect->corner.x = 0;
	rect->corner.y = 0;
	rect->extent.width = (uint32_t) pText->CharCount;
	rect->extent.height = 1;
	(void) unused;
}

// This function calculates how much of a string can be fitted within
// a specific width, up to a newline or terminating \0.
// pText is the text to be fitted. pText->CharCount will be set to the
// number of characters that fitted.
// startNext will be filled with the start of the first word that
// doesn't fit in one line, or if an entire line fits, to the character
// past the newline, or if the entire string fits, to the end of the
// string.
// maxWidth is the maximum number of pixels that a line may be wide
//   ASSUMPTION: there are no words in the text wider than maxWidth
// maxChars is the maximum number of characters (not bytes) that are to
// be fitted.
// TRUE is returned if a complete line fitted
// FALSE otherwise
BOOLEAN
getLineWithinWidth(TEXT *pText, const char **startNext,
		SIZE maxWidth, COUNT maxChars)
{
	BOOLEAN eol;
			// The end of the line of text has been reached.
	BOOLEAN done;
			// We cannot add any more words.
	RECT rect;
	COUNT oldCount;
	const char *ptr;
	const char *wordStart;
	UniChar ch;
	COUNT charCount;

	//GetContextClipRect (&rect);

	eol = 0;
	done = 0;
	oldCount = 1;
	charCount = 0;
	ch = '\0';
	ptr = pText->pStr;
	for (;;)
	{
		wordStart = ptr;

		// Scan one word.
		for (;;)
		{
			if (*ptr == '\0')
			{
				eol = 1;
				done = 1;
				break;
			}
			ch = getCharFromString (&ptr);
			eol = ch == '\0' || ch == '\n' || ch == '\r';
			done = eol || charCount >= maxChars;
			if (done || ch == ' ')
				break;
			charCount++;
		}

		oldCount = pText->CharCount;
		pText->CharCount = charCount;
		TextRect (pText, &rect, NULL);

		if ((SIZE) rect.extent.width >= maxWidth)
		{
			pText->CharCount = oldCount;
			*startNext = wordStart;
			return 0;
		}

		if (done)
		{
			*startNext = ptr;
			return eol;
		}
		charCount++;
				// For the space in between words.
	}
}

static const uint8_t UQM_VERSION[] =
		"UQM minimal wasm (derived from comm.c)";

uint32_t
uqm_version (void)
{
	return (uint32_t) (uintptr_t) UQM_VERSION;
}

uint32_t
uqm_version_ptr (void)
{
	return uqm_version ();
}

uint32_t
uqm_version_len (void)
{
	return (uint32_t) (sizeof (UQM_VERSION) - 1);
}

extern uint8_t __heap_base;
static uint32_t heap_ptr;

uint32_t
uqm_alloc (uint32_t size)
{
	uint32_t p;

	if (heap_ptr == 0)
		heap_ptr = (uint32_t) (uintptr_t) &__heap_base;

	p = heap_ptr;
	heap_ptr = (p + size + 7u) & ~7u;
	return p;
}

uint32_t
uqm_line_fit_chars (const char *str, uint32_t maxWidth)
{
	TEXT t;
	const char *next = NULL;

	t.pStr = str;
	t.CharCount = 0;
	getLineWithinWidth (&t, &next, (SIZE) maxWidth, (COUNT) ~0u);
	return t.CharCount;
}

/*
 * Minimal conversation core
 *
 * The line-fitting code above is derived from UQM (comm.c). Everything below
 * is newly written for this project, but it intentionally mirrors the logic
 * in uqm_min.wat so that different wasm toolchains expose the same ABI.
 *
 * Graph layout (written by JS into wasm linear memory):
 *
 * nodesPtr points at:
 *   u32 nodeCount;
 *   u32 totalChoices;
 *   NodeMeta nodes[nodeCount];  // each: { u32 firstChoice; u32 choiceCount }
 *
 * choicesPtr points at an array of packed ChoiceMeta structs:
 *   ChoiceMeta {
 *     i32 nextNode;
 *     i16 d0, d1, d2;
 *     i16 reqFaction;
 *     i16 reqMin;
 *     u32 revealSecretMaskLo;
 *     u32 revealSecretMaskHi;
 *
 *     // Optional proof-gating (based on the same secrets bitmask as reveals):
 *     u32 requiresAllMaskLo;
 *     u32 requiresAllMaskHi;
 *     u32 requiresAnyMaskLo;
 *     u32 requiresAnyMaskHi;
 *   }
 *
 * ChoiceMeta is treated as packed (38 bytes).
 */

#if defined(__wasm__) || defined(__wasm32__) || defined(__wasm64__) || defined(__EMSCRIPTEN__)
#define UQM_WASM_EXPORT(name) __attribute__((export_name(name))) __attribute__((used))
#else
#define UQM_WASM_EXPORT(name)
#endif

static int32_t conv_currentNode;
static int32_t conv_rep[3];
static uint32_t conv_secretsLo;
static uint32_t conv_secretsHi;

static uint32_t conv_nodesPtr;
static uint32_t conv_choicesPtr;

static uint32_t
load_u32_le (uint32_t p)
{
	const uint8_t *b = (const uint8_t *) (uintptr_t) p;
	return (uint32_t) b[0]
			| ((uint32_t) b[1] << 8)
			| ((uint32_t) b[2] << 16)
			| ((uint32_t) b[3] << 24);
}

static uint16_t
load_u16_le (uint32_t p)
{
	const uint8_t *b = (const uint8_t *) (uintptr_t) p;
	return (uint16_t) ((uint16_t) b[0] | ((uint16_t) b[1] << 8));
}

static int32_t
load_i32_le (uint32_t p)
{
	return (int32_t) load_u32_le (p);
}

static int32_t
load_i16_le (uint32_t p)
{
	return (int32_t) (int16_t) load_u16_le (p);
}

static uint32_t
conv_graph_node_count (void)
{
	if (conv_nodesPtr == 0)
		return 0;
	return load_u32_le (conv_nodesPtr + 0u);
}

static uint32_t
conv_graph_total_choices (void)
{
	if (conv_nodesPtr == 0)
		return 0;
	return load_u32_le (conv_nodesPtr + 4u);
}

static uint32_t
conv_graph_node_meta_ptr (uint32_t nodeIdx)
{
	return conv_nodesPtr + 8u + nodeIdx * 8u;
}

static uint32_t
conv_graph_choice_ptr (uint32_t choiceIdx)
{
	return conv_choicesPtr + choiceIdx * 38u;
}

static uint32_t
conv_is_current_node_valid (void)
{
	uint32_t nodeCount;
	if (conv_nodesPtr == 0)
		return 0;
	if (conv_currentNode < 0)
		return 0;
	nodeCount = conv_graph_node_count ();
	return (uint32_t) conv_currentNode < nodeCount;
}

static uint32_t
conv_current_node_choice_count (void)
{
	uint32_t nodeMetaPtr;
	if (!conv_is_current_node_valid ())
		return 0;
	nodeMetaPtr = conv_graph_node_meta_ptr ((uint32_t) conv_currentNode);
	return load_u32_le (nodeMetaPtr + 4u);
}

static uint32_t
conv_choice_ptr_local (int32_t localIdx)
{
	uint32_t uLocalIdx;
	uint32_t nodeMetaPtr;
	uint32_t firstChoice;
	uint32_t choiceCount;
	uint32_t absChoice;

	if (!conv_is_current_node_valid () || conv_choicesPtr == 0)
		return 0;

	if (localIdx < 0)
		return 0;
	uLocalIdx = (uint32_t) localIdx;

	nodeMetaPtr = conv_graph_node_meta_ptr ((uint32_t) conv_currentNode);
	firstChoice = load_u32_le (nodeMetaPtr + 0u);
	choiceCount = load_u32_le (nodeMetaPtr + 4u);

	if (uLocalIdx >= choiceCount)
		return 0;

	absChoice = firstChoice + uLocalIdx;
	if (absChoice >= conv_graph_total_choices ())
		return 0;

	return conv_graph_choice_ptr (absChoice);
}

static uint32_t
conv_choice_is_locked_internal (int32_t localIdx)
{
	uint32_t choicePtr;
	int32_t reqFaction;
	int32_t reqMin;
	int32_t rep;
	uint32_t allLo, allHi;
	uint32_t anyLo, anyHi;
	uint32_t okAll;
	uint32_t okAny;

	choicePtr = conv_choice_ptr_local (localIdx);
	if (choicePtr == 0)
		return 1;

	// Proof/secret gating.
	allLo = load_u32_le (choicePtr + 22u);
	allHi = load_u32_le (choicePtr + 26u);
	anyLo = load_u32_le (choicePtr + 30u);
	anyHi = load_u32_le (choicePtr + 34u);

	okAll = ((conv_secretsLo & allLo) == allLo) && ((conv_secretsHi & allHi) == allHi);
	if (!okAll)
		return 1;

	if (anyLo != 0u || anyHi != 0u)
	{
		okAny = ((conv_secretsLo & anyLo) != 0u) || ((conv_secretsHi & anyHi) != 0u);
		if (!okAny)
			return 1;
	}

	// Reputation gating.
	reqFaction = load_i16_le (choicePtr + 10u);
	reqMin = load_i16_le (choicePtr + 12u);

	if (reqFaction < 0)
		return 0;

	rep = 0;
	if (reqFaction == 0)
		rep = conv_rep[0];
	else if (reqFaction == 1)
		rep = conv_rep[1];
	else if (reqFaction == 2)
		rep = conv_rep[2];
	else
		return 1;

	return rep < reqMin;
}

UQM_WASM_EXPORT("uqm_conv_reset")
void
uqm_conv_reset (int32_t startNode, int32_t rep0, int32_t rep1, int32_t rep2,
		uint32_t secrets)
{
	conv_currentNode = startNode;
	conv_rep[0] = rep0;
	conv_rep[1] = rep1;
	conv_rep[2] = rep2;
	conv_secretsLo = secrets;
	conv_secretsHi = 0u;
}

UQM_WASM_EXPORT("uqm_conv_reset64")
void
uqm_conv_reset64 (int32_t startNode, int32_t rep0, int32_t rep1, int32_t rep2,
		uint32_t secretsLo, uint32_t secretsHi)
{
	conv_currentNode = startNode;
	conv_rep[0] = rep0;
	conv_rep[1] = rep1;
	conv_rep[2] = rep2;
	conv_secretsLo = secretsLo;
	conv_secretsHi = secretsHi;
}

UQM_WASM_EXPORT("uqm_conv_set_graph")
void
uqm_conv_set_graph (uint32_t nodesPtr, uint32_t choicesPtr)
{
	conv_nodesPtr = nodesPtr;
	conv_choicesPtr = choicesPtr;
}

UQM_WASM_EXPORT("uqm_conv_set_graph_blob")
void
uqm_conv_set_graph_blob (uint32_t blobPtr)
{
	uint32_t nodeCount;
	uint32_t nodesSize;

	if (blobPtr == 0u)
	{
		conv_nodesPtr = 0u;
		conv_choicesPtr = 0u;
		return;
	}

	nodeCount = load_u32_le (blobPtr + 0u);
	nodesSize = 8u + nodeCount * 8u;

	conv_nodesPtr = blobPtr;
	conv_choicesPtr = blobPtr + nodesSize;
}

UQM_WASM_EXPORT("uqm_conv_get_current_node")
int32_t
uqm_conv_get_current_node (void)
{
	return conv_currentNode;
}

UQM_WASM_EXPORT("uqm_conv_get_rep")
int32_t
uqm_conv_get_rep (int32_t idx)
{
	if (idx < 0 || idx >= 3)
		return 0;
	return conv_rep[(uint32_t) idx];
}

UQM_WASM_EXPORT("uqm_conv_get_secrets")
uint32_t
uqm_conv_get_secrets (void)
{
	return conv_secretsLo;
}

UQM_WASM_EXPORT("uqm_conv_get_secrets_lo")
uint32_t
uqm_conv_get_secrets_lo (void)
{
	return conv_secretsLo;
}

UQM_WASM_EXPORT("uqm_conv_get_secrets_hi")
uint32_t
uqm_conv_get_secrets_hi (void)
{
	return conv_secretsHi;
}

UQM_WASM_EXPORT("uqm_conv_get_choice_count")
uint32_t
uqm_conv_get_choice_count (void)
{
	return conv_current_node_choice_count ();
}

UQM_WASM_EXPORT("uqm_conv_choice_get_req_faction")
int32_t
uqm_conv_choice_get_req_faction (int32_t localIdx)
{
	uint32_t choicePtr;
	choicePtr = conv_choice_ptr_local (localIdx);
	if (choicePtr == 0u)
		return -1;
	return load_i16_le (choicePtr + 10u);
}

UQM_WASM_EXPORT("uqm_conv_choice_get_req_min")
int32_t
uqm_conv_choice_get_req_min (int32_t localIdx)
{
	uint32_t choicePtr;
	choicePtr = conv_choice_ptr_local (localIdx);
	if (choicePtr == 0u)
		return 0;
	return load_i16_le (choicePtr + 12u);
}

UQM_WASM_EXPORT("uqm_conv_choice_get_d0")
int32_t
uqm_conv_choice_get_d0 (int32_t localIdx)
{
	uint32_t choicePtr;
	choicePtr = conv_choice_ptr_local (localIdx);
	if (choicePtr == 0u)
		return 0;
	return load_i16_le (choicePtr + 4u);
}

UQM_WASM_EXPORT("uqm_conv_choice_get_d1")
int32_t
uqm_conv_choice_get_d1 (int32_t localIdx)
{
	uint32_t choicePtr;
	choicePtr = conv_choice_ptr_local (localIdx);
	if (choicePtr == 0u)
		return 0;
	return load_i16_le (choicePtr + 6u);
}

UQM_WASM_EXPORT("uqm_conv_choice_get_d2")
int32_t
uqm_conv_choice_get_d2 (int32_t localIdx)
{
	uint32_t choicePtr;
	choicePtr = conv_choice_ptr_local (localIdx);
	if (choicePtr == 0u)
		return 0;
	return load_i16_le (choicePtr + 8u);
}

UQM_WASM_EXPORT("uqm_conv_choice_get_reveal_lo")
uint32_t
uqm_conv_choice_get_reveal_lo (int32_t localIdx)
{
	uint32_t choicePtr;
	choicePtr = conv_choice_ptr_local (localIdx);
	if (choicePtr == 0u)
		return 0u;
	return load_u32_le (choicePtr + 14u);
}

UQM_WASM_EXPORT("uqm_conv_choice_get_reveal_hi")
uint32_t
uqm_conv_choice_get_reveal_hi (int32_t localIdx)
{
	uint32_t choicePtr;
	choicePtr = conv_choice_ptr_local (localIdx);
	if (choicePtr == 0u)
		return 0u;
	return load_u32_le (choicePtr + 18u);
}

UQM_WASM_EXPORT("uqm_conv_choice_is_locked")
int32_t
uqm_conv_choice_is_locked (int32_t localIdx)
{
	return (int32_t) conv_choice_is_locked_internal (localIdx);
}

UQM_WASM_EXPORT("uqm_conv_get_locked_choices_lo")
uint32_t
uqm_conv_get_locked_choices_lo (void)
{
	uint32_t count;
	uint32_t mask;
	uint32_t i;

	count = conv_current_node_choice_count ();
	mask = 0u;

	for (i = 0u; i < count && i < 32u; i++)	{
		if (conv_choice_is_locked_internal ((int32_t) i))
			mask |= 1u << i;
	}

	return mask;
}

UQM_WASM_EXPORT("uqm_conv_get_locked_choices_hi")
uint32_t
uqm_conv_get_locked_choices_hi (void)
{
	uint32_t count;
	uint32_t mask;
	uint32_t i;

	count = conv_current_node_choice_count ();
	mask = 0u;

	for (i = 32u; i < count && i < 64u; i++)	{
		if (conv_choice_is_locked_internal ((int32_t) i))
			mask |= 1u << (i - 32u);
	}

	return mask;
}

UQM_WASM_EXPORT("uqm_conv_choose")
int32_t
uqm_conv_choose (int32_t localIdx)
{
	uint32_t uLocalIdx;
	uint32_t nodeMetaPtr;
	uint32_t firstChoice;
	uint32_t choiceCount;
	uint32_t absChoice;
	uint32_t choicePtr;
	int32_t nextNode;
	int32_t d0, d1, d2;
	uint32_t revealLo;
	uint32_t revealHi;

	if (conv_choice_is_locked_internal (localIdx))
		return -1;

	uLocalIdx = (uint32_t) localIdx;

	nodeMetaPtr = conv_graph_node_meta_ptr ((uint32_t) conv_currentNode);
	firstChoice = load_u32_le (nodeMetaPtr + 0u);
	choiceCount = load_u32_le (nodeMetaPtr + 4u);
	if (uLocalIdx >= choiceCount)
		return -1;

	absChoice = firstChoice + uLocalIdx;
	if (absChoice >= conv_graph_total_choices ())
		return -1;
	choicePtr = conv_graph_choice_ptr (absChoice);

	nextNode = load_i32_le (choicePtr + 0u);
	d0 = load_i16_le (choicePtr + 4u);
	d1 = load_i16_le (choicePtr + 6u);
	d2 = load_i16_le (choicePtr + 8u);
	revealLo = load_u32_le (choicePtr + 14u);
	revealHi = load_u32_le (choicePtr + 18u);

	conv_rep[0] += d0;
	conv_rep[1] += d1;
	conv_rep[2] += d2;
	conv_secretsLo |= revealLo;
	conv_secretsHi |= revealHi;
	conv_currentNode = nextNode;

	return nextNode;
}

UQM_WASM_EXPORT("uqm_conv_choose_force")
int32_t
uqm_conv_choose_force (int32_t localIdx)
{
	uint32_t uLocalIdx;
	uint32_t nodeMetaPtr;
	uint32_t firstChoice;
	uint32_t choiceCount;
	uint32_t absChoice;
	uint32_t choicePtr;
	int32_t nextNode;
	int32_t d0, d1, d2;
	uint32_t revealLo;
	uint32_t revealHi;

	if (localIdx < 0)
		return -1;

	uLocalIdx = (uint32_t) localIdx;

	nodeMetaPtr = conv_graph_node_meta_ptr ((uint32_t) conv_currentNode);
	if (nodeMetaPtr == 0u)
		return -1;

	firstChoice = load_u32_le (nodeMetaPtr + 0u);
	choiceCount = load_u32_le (nodeMetaPtr + 4u);
	if (uLocalIdx >= choiceCount)
		return -1;

	absChoice = firstChoice + uLocalIdx;
	if (absChoice >= conv_graph_total_choices ())
		return -1;
	choicePtr = conv_graph_choice_ptr (absChoice);

	nextNode = load_i32_le (choicePtr + 0u);
	d0 = load_i16_le (choicePtr + 4u);
	d1 = load_i16_le (choicePtr + 6u);
	d2 = load_i16_le (choicePtr + 8u);
	revealLo = load_u32_le (choicePtr + 14u);
	revealHi = load_u32_le (choicePtr + 18u);

	conv_rep[0] += d0;
	conv_rep[1] += d1;
	conv_rep[2] += d2;
	conv_secretsLo |= revealLo;
	conv_secretsHi |= revealHi;
	conv_currentNode = nextNode;

	return nextNode;
}
