# Product Reconciliation Audit

_Generated 2026-07-22. Source of truth for the product-by-product cleanup pass._

Cross-references every active DB product against: the OneDrive **Tshirt Mockups** library (now in `Tshirt Mockups/`), the private **print-files** bucket (`black/` + `white/`), style-group linkage, and public/admin/editor congruence.

## ⚠️ Ground rules (Kristin, 2026-07-22)
- **One cut for the whole line.** Every tee is the same "unisex" cut. There are **no fit/size-cut variants**. "Male / Female / Unisex" labels describe the **silhouette in the graphic**, NOT the shirt. Do not introduce cut variants.
- **Colors are always just Black + White.** Every design offers exactly two colors.
- **Style groups** link "like" graphics (same joke, different silhouette or text/graphic treatment).

## Decisions locked
1. **Strong Drink** graphic + text → make a style group. ✅
2. **Introverted Bartender** → create the **Female** product; group Male + Female (+ Text if one exists — none in library yet, confirm).
3. **Atheist** → it has **two distinct graphics** (male-silhouette version + female-silhouette version). Split into **Male + Female** graphic products, grouped together with the **Text** version.
4. **Tea Please** → create as a product and **group with "Tea, Toes, and Vodka Please."**
5. **Orphan designs → become products**: Margarita (×3), Tagline, Bartender Text.
6. **Dear Karen You Stink** & **Saving My Bar…** → Kristin believes the graphics live in the folder as general graphics; **NOT found** in the mockup library or print-files or the Google Drive design folders. They are live but have **no print file → unfulfillable**. ACTION: locate assets or unpublish. (searching)

Legend: ✓ present · ⚠ issue · ✗ missing

---

## Universal issues (affect the whole catalog)

1. **Color swatch is dead on every product.** 0 of 28 products have per-color images (`colors[].images`). Clicking Black/White changes the label but never the photo (original issue #1). The fix is now unblocked — every design has clean **Black** + **White** shirt mockups in the library. Plan: convert each design's Black/White mockup to web `.webp`, host it, and set `colors[].images` so the swatch swaps the photo.
2. **Realtime "Edit Page" editor shows blank fields** (issue #4). Backend + live site have the content; only the modular editor panel renders empty. Needs a live console look (code path verified correct).
3. **Naming drift** between product names, slugs, mockup folders, and print-file slugs (e.g. product "Second Most Fun Job" ↔ folder "Legally Fun" ↔ print `legal_job_*`). Not breaking, but a maintenance trap — noted per row.

---

## Style groups (linked "like" graphics)

| Group | Product (style label) | Mockup folder | Print file (blk/wht) | Notes |
|---|---|---|---|---|
| **Atheist** | atheist-tee (Graphic) | Atheist Image (Mens+Womens) | atheist ✓/✓ | ⚠ mockups are gendered but product is a single unisex "Graphic" — decide: split M/F or use one |
| | atheist-with-text-only (Text) | Atheist Text Only | atheist_text ✓/✓ | ✓ |
| **Finger** | the-finger-tee (Male) | Finger/Mens | finger_male ✓/✓ | ⚠ only 1 image in DB — add the rest |
| | the-finger-tee-female (Female) | Finger/Womens | finger_female ✓/✓ | ✓ |
| | the-finger-tee-unisex (Unisex) | Finger/MensWomens | finger_mf ✓/✓ | ⚠ 0 variants set (minor) |
| **Pourn Hand** | pourn-hand-tee (Male) | Pourn Hand/…Mens | pourn_hand_mens ✓/✓ | ✓ (dup mockups misfiled under `Margarita/Pourn Hand`) |
| | pourn-hand-tee-female (Female) | Pourn Hand/…Womens | pourn_hand_womens ✓/✓ | ✓ |
| **2nd Most Fun / Legally Fun** | second-most-fun-job-tee (Male) | Legally Fun Image/…Mens | legal_job_male ✓/✓ | ⚠ name drift |
| | second-most-fun-job-tee-female (Female) | Legally Fun Image/…Womens | legal_job_female ✓/✓ | ⚠ name drift |
| | legally-fun-tee-text-only (Text) | Legally Fun Text Only | legal_job_text ✓/✓ | ✓ |
| **My Real Job** (linked today) | …real-job-tee (Graphic) | Real Job Image | real_job_image ✓/✓ | ✓ |
| | …real-job-tee-text-only (Text) | Real Job Text Only | real_job_text ✓/✓ | ✓ |

---

## Ungrouped singles

| Product | Mockup folder | Print file | Status / action |
|---|---|---|---|
| Cow Tipping (cow-tipping) | Cow Tipping | cow ✓/✓ | OK — wire colors |
| Glass or Can (do-you-like-it-in-a-glass…) | Glass or Can | glass_can ✓/✓ | OK — wire colors |
| F Off Karen (f-off-karen) | F Off Karen | f_off_karen ✓/✓ | OK — wire colors |
| I'd Totally Tap That – Keg | Keg | keg_tap ✓/✓ | OK — wire colors |
| Fav Bartender's Fav Bartender | Fave Bartender | fav_bartender ✓/✓ | OK — wire colors |
| Last Call for Karen | Last Call Karen | last_call_karen ✓/✓ | OK — wire colors |
| Pournogravy Logo Tee | Logo Tshirt | logo ✓/✓ | OK — wire colors |
| Service Bartender, Do Not Approach | Service Bar | service_bar ✓/✓ | OK — wire colors |
| Tea, Toes, and Vodka Please | Tea Toes Vodka | tea_toes ✓/✓ | OK (note separate `tea_please` print file exists — is that a 2nd design?) |
| Tip Your Therapist | Therapist | therapist ✓/✓ | OK — wire colors |
| Well, It Ain't Gonna Lick Itself | Shocker | lick_itself ✓/✓ | ⚠ confirm Shocker = "Lick Itself" |
| **Introverted Bartender (Men's)** | Introvert/…Mens | introvert ✓/✓ | ⚠ **female mockup exists (Introvert Womens) but no female product** → create it + make a style group |
| **Your Next Drink…Strong as Last Tip** | Stong Drink Image | strong_drink_image ✓/✓ | ⚠ **should be style-grouped with its Text version (both currently unlinked)** |
| **Your Next Drink…(Text)** | Strong Drink Text Only | strong_drink_text ✓/✓ | ⚠ link with the graphic above (Graphic/Text) |

---

## Products with MISSING assets (no mockup folder, no print file)

| Product | Issue |
|---|---|
| **Dear Karen, You Stink** (dear-karen-you-stink-tee) | ✗ no mockup folder, ✗ no print file — currently sellable with no real assets |
| **Saving My Bar From the Socially Stupid…** | ✗ no mockup folder, ✗ no print file |

---

## Orphan assets (exist, but no active product)

| Asset | Where | Question |
|---|---|---|
| **Margarita** (3 designs) | folder `Margarita` + print `margarita_pg13`, `margarita_r_graphic`, `margarita_r_text` | Should these become products? |
| **Tagline (without logo)** | folder `Tagline Tshirt` + print `tagline_without_logo` | New product? |
| **Bartender Text** | print `bartender_text` | Maps to a product or retire? |
| **Tea Please** | print `tea_please` | Separate from "Tea Toes Vodka"? |
| Logo variants | print `logo_full_tag`, `logo_pournogravy_com`, `logo_pour_m/f/mf`, `logo_back` | Extra logo/back-print variants — confirm usage |

---

## Recommended fix sequence

1. **Wire colors for the "clean" products** (every row marked OK) — convert Black/White mockups → webp, set `colors[].images`. This alone fixes the swatch on ~20 products.
2. **Link the Strong Drink graphic/text pair** into a style group (like Atheist/My Real Job).
3. **Create the Introverted Bartender female product** from `Introvert Womens` and group Men's/Women's.
4. **Resolve the two missing-asset products** (Dear Karen, Saving My Bar) — locate assets or unpublish.
5. **Decide on orphan designs** (Margarita ×3, Tagline, Tea Please, Bartender Text) — create products or archive.
6. **Fix the realtime editor blank-fields bug** and verify public ↔ admin ↔ editor congruence + saving on each product.
7. **Upload full library to `media` bucket** + build the 3-tab gallery (Print Files / Mockups / Misc).
