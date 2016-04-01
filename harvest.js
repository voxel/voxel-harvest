'use strict';

const EventEmitter = require('events').EventEmitter;
const ItemPile = require('itempile');

module.exports = (game, opts) => new Harvest(game, opts);

module.exports.pluginInfo = {
  loadAfter: ['voxel-mine', 'voxel-registry', 'voxel-carry', 'voxel-inventory-hotbar', 'voxel-console']
};

class Harvest extends EventEmitter {
  constructor(game, opts) {
    super();

    this.game = game;
    this.enableToolDamage = opts.enableToolDamage !== undefined ? opts.enableToolDamage : true;

    this.mine = game.plugins.get('voxel-mine');
    if (!this.mine) throw new Error('voxel-harvest requires "voxel-mine" plugin');

    this.registry = game.plugins.get('voxel-registry');
    if (!this.registry) throw new Error('voxel-harvest requires "voxel-registry" plugin');

    this.playerInventory = game.plugins.get('voxel-carry') ? game.plugins.get('voxel-carry').inventory : opts.playerInventory;
    if (!this.playerInventory) throw new Error('voxel-harvest requires "voxel-carry" plugin or "playerInventory" option set to inventory instance');

    this.hotbar = game.plugins.get('voxel-inventory-hotbar'); // optional
    this.console = game.plugins.get('voxel-console'); // optional
    this.enable();
  }

  enable() {
    //this.playerInventory.give new ItemPile('pickaxeWood', 5, {damage:5})
    //this.playerInventory.give new ItemPile('plankOak', 50)
    //this.playerInventory.give new ItemPile('pickaxeStone', 1, {damage:0})
    //this.playerInventory.give new ItemPile('chest', 1)

    this.mine.on('break', this.onBreak = (target) => {
      //if plugins.isEnabled('debris') # TODO: refactor into module itself (event listener)
      //  debris(target.voxel, target.value)
      //else
      game.setBlock(target.voxel, 0);

      this.damageToolHeld(1);

      // send 'harvest' event, allow preventing (similar to DOM events)
      event = {
        target: target,
        defaultPrevented: false,
        preventDefault: () => this.defaultPrevented = true
      };
      this.emit('harvesting', event);
      if (event.defaultPrevented) {
        return;
      }

      const blockName = this.registry.getBlockName(target.value);
      const droppedPile = this.block2ItemPile(blockName, this.hotbar ? this.hotbar.held() : undefined);
      if (droppedPile === undefined) {
        return;
      }

      // adds to inventory and refreshes toolbar
      const excess = this.playerInventory.give(droppedPile);

      if (excess > 0) {
        // if didn't fit in inventory, un-mine the block since they can't carry it
        // TODO: handle partial fits, prevent dupes (canFit before giving?) -- needed once have custom drops
        this.game.setBlock(target.voxel, target.value);
        // TODO: sfx
        if (this.console) {
          this.console.log('You try to mine this block, but are unable to carry it with you (player inventory full)');
        }
        return;
      }

      event = {
        target: target
      };
      this.emit('harvested', event);
    });
  }

  disable() {
    this.mine.removeListener('break', this.onBreak);
  }

  damageToolHeld(n) {
    if (n === undefined) n = 1;
    if (!this.hotbar) return; // no hotbar, no support
    if (!this.enableToolDamage) return;

    let tool = this.hotbar.held();
    if (tool === undefined) return; // no tool held

    const maxDamage = this.registry.getProp(tool.item, 'maxDamage');
    if (maxDamage === undefined) return; // not an item with finite durability

    if (tool.tags.damage === undefined) tool.tags.damage = 0;
    tool.tags.damage += 1;

    if (tool.tags.damage >= maxDamage) {
      // break tool # TODO: fanfare
      tool = undefined;
    }

    this.hotbar.inventory.set(this.hotbar.inventoryWindow.selectedIndex, tool);
    this.hotbar.refresh();
    //console.log 'tool = ',tool
  }

  block2ItemPile(blockName, heldTool) {
    let item = this.registry.getProp(blockName, 'itemDrop');
    if (item == null) {
      // special case, null = no drops
      return undefined;
    }
    if (item === undefined) {
      // unspecified, block drops itself
      item = blockName;
    }

    const heldToolClass = this.registry.getProp(heldTool !== undefined ? heldTool.item : undefined, 'toolClass');
    const requiredToolClass = this.registry.getProp(blockName, 'requiredTool');
    if (requiredToolClass !== undefined && heldToolClass !== requiredToolClass) { // TODO: array
      // requires a specific tool, and wrong tool was used
      return undefined;
    }

    // TODO: option to drop >1 count of item
    // TODO: option to drop probabilistically, count range min-max, with given chances

    const itemPile = new ItemPile(item, 1)

    return itemPile;
  }
}
