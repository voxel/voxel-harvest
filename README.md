# voxel-harvest

Add mined blocks from [voxel-mine](https://github.com/deathcap/voxel-mine) to an [inventory](https://github.com/deathcap/inventory)

Listens for 'break' events (sent by voxel-mine when mining completes), sets the voxel to air,
and then adds a new corresponding [itempile](https://github.com/deathcap/itempile) to the specified inventory
(can be set to, for example, a player's inventory connected to a
[voxel-inventory-hotbar](https://github.com/deathcap/voxel-inventory-hotbar)).

If the item cannot fit in the inventory, the voxel is not removed (fails to mine because you can't carry it anyway).

Here's an example, before the block breaks:

![screenshot before](http://i.imgur.com/Q7o94t7.png "Screenshot mining")

and after, you can see the voxel is gone and an item is added to the inventory:

![screenshot after](http://i.imgur.com/NyRQJ4f.png "Screenshot mining")

## License

MIT

