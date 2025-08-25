# Inventory-Placed Buildings

Some entities are placed from inventory rather than constructed through the build queue:

- Tent (`tent`)
- Founders Wagon (`foundersWagon`)

Properties:
- They exist as inventory items in `InventoryManager` under `buildings`.
- They are `consumable` and `placeable`; placement consumes one item.
- Placement uses `InventoryManager.placeBuilding`, which creates a built building entry immediately.

Notes:
- `foundersWagon` is seeded as a starting inventory item and is free to place.
- These are not part of the work-point construction system and have `constructionPoints` of 0 (pre-built) or are not constructed via queue.
