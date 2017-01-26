/*L.Map.mergeOptions({
 editControl: true
 });*/
/**
 * @class L.EditToolbar
 * @aka EditToolbar
 */
L.EditToolbar = L.Toolbar.extend({
	statics: {
		TYPE: 'edit'
	},

	options: {
		edit: {
			selectedPathOptions: {
				dashArray: '10, 10',

				fill: true,
				fillColor: '#fe57a1',
				fillOpacity: 0.1,

				// Whether to user the existing layers color
				maintainColor: false
			}
		},
		remove: {},
		poly: null,
		featureGroup: null /* REQUIRED! TODO: perhaps if not set then all layers on the map are selectable? */
	},

	// @method intialize(): void
	initialize: function (options) {
		// Need to set this manually since null is an acceptable value here
		if (options.edit) {
			if (typeof options.edit.selectedPathOptions === 'undefined') {
				options.edit.selectedPathOptions = this.options.edit.selectedPathOptions;
			}
			options.edit.selectedPathOptions = L.extend({}, this.options.edit.selectedPathOptions, options.edit.selectedPathOptions);
		}

		if (options.remove) {
			options.remove = L.extend({}, this.options.remove, options.remove);
		}

		if (options.poly) {
			options.poly = L.extend({}, this.options.poly, options.poly);
		}

		this._toolbarClass = 'leaflet-draw-edit';
		L.Toolbar.prototype.initialize.call(this, options);

		this._selectedFeatureCount = 0;
	},

	// @method getModeHandlers(): object
	// Get mode handlers information
	getModeHandlers: function (map) {
		var featureGroup = this.options.featureGroup;
		return [
			{
				enabled: this.options.edit,
				handler: new L.EditToolbar.Edit(map, {
					featureGroup: featureGroup,
					selectedPathOptions: this.options.edit.selectedPathOptions,
					poly: this.options.poly
				}),
				title: L.drawLocal.edit.toolbar.buttons.edit
			},
			{
				enabled: this.options.remove,
				handler: new L.EditToolbar.Delete(map, {
					featureGroup: featureGroup
				}),
				title: L.drawLocal.edit.toolbar.buttons.remove
			}
		];
	},

	// @method getActions(): object
	// Get actions information
	getActions: function () {
		return [
			{
				title: L.drawLocal.edit.toolbar.actions.save.title,
				text: L.drawLocal.edit.toolbar.actions.save.text,
				callback: this._save,
				context: this
			},
			{
				title: L.drawLocal.edit.toolbar.actions.cancel.title,
				text: L.drawLocal.edit.toolbar.actions.cancel.text,
				callback: this.disable,
				context: this
			}
		];
	},

	// @method addToolbar(map): L.DomUtil
	// Adds the toolbar to the map
	addToolbar: function (map) {
		var container = L.Toolbar.prototype.addToolbar.call(this, map);

		this._checkDisabled();

		this.options.featureGroup.on('layeradd layerremove', this._checkDisabled, this);

		return container;
	},

	// @method removeToolbar(): void
	// Removes the toolbar from the map
	removeToolbar: function () {
		this.options.featureGroup.off('layeradd layerremove', this._checkDisabled, this);

		L.Toolbar.prototype.removeToolbar.call(this);
	},

	// @method disable(): void
	// Disables the toolbar
	disable: function () {
		if (!this.enabled()) {
			return;
		}

		this._activeMode.handler.revertLayers();

		L.Toolbar.prototype.disable.call(this);
	},

	_save: function () {
		this._activeMode.handler.save();
		if (this._activeMode) {
			this._activeMode.handler.disable();
		}
	},

	_checkDisabled: function () {
		var featureGroup = this.options.featureGroup,
			hasLayers = featureGroup.getLayers().length !== 0,
			button;

		if (this.options.edit) {
			button = this._modes[L.EditToolbar.Edit.TYPE].button;

			if (hasLayers) {
				L.DomUtil.removeClass(button, 'leaflet-disabled');
			} else {
				L.DomUtil.addClass(button, 'leaflet-disabled');
			}

			button.setAttribute(
				'title',
				hasLayers ?
					L.drawLocal.edit.toolbar.buttons.edit
					: L.drawLocal.edit.toolbar.buttons.editDisabled
			);
		}

		if (this.options.remove) {
			button = this._modes[L.EditToolbar.Delete.TYPE].button;

			if (hasLayers) {
				L.DomUtil.removeClass(button, 'leaflet-disabled');
			} else {
				L.DomUtil.addClass(button, 'leaflet-disabled');
			}

			button.setAttribute(
				'title',
				hasLayers ?
					L.drawLocal.edit.toolbar.buttons.remove
					: L.drawLocal.edit.toolbar.buttons.removeDisabled
			);
		}
	}
});

/**
 * @class L.EditToolbar.Edit
 * @aka EditToolbar.Edit
 */
L.EditToolbar.Edit = L.Handler.extend({
	statics: {
		TYPE: 'edit'
	},

	includes: L.Mixin.Events,

	// @method intialize(): void
	initialize: function (map, options) {
		L.Handler.prototype.initialize.call(this, map);

		L.setOptions(this, options);

		// Store the selectable layer group for ease of access
		this._featureGroup = options.featureGroup;

		if (!(this._featureGroup instanceof L.FeatureGroup)) {
			throw new Error('options.featureGroup must be a L.FeatureGroup');
		}

		this._uneditedLayerProps = {};

		// Save the type so super can fire, need to do this as cannot do this.TYPE :(
		this.type = L.EditToolbar.Edit.TYPE;
	},

	// @method enable(): void
	// Enable the edit toolbar
	enable: function () {
		if (this._enabled || !this._hasAvailableLayers()) {
			return;
		}
		this.fire('enabled', { handler: this.type });
		//this disable other handlers

		this._map.fire(L.Draw.Event.EDITSTART, { handler: this.type });
		//allow drawLayer to be updated before beginning edition.

		L.Handler.prototype.enable.call(this);
		this._featureGroup
			.on('layeradd', this._enableLayerEdit, this)
			.on('layerremove', this._disableLayerEdit, this);
	},

	// @method disable(): void
	// Disable the edit toolbar
	disable: function () {
		if (!this._enabled) {
			return;
		}
		this._featureGroup
			.off('layeradd', this._enableLayerEdit, this)
			.off('layerremove', this._disableLayerEdit, this);
		L.Handler.prototype.disable.call(this);
		this._map.fire(L.Draw.Event.EDITSTOP, { handler: this.type });
		this.fire('disabled', { handler: this.type });
	},

	// @method addHooks(): void
	// Add listener hooks for this handler
	addHooks: function () {
		var map = this._map;

		if (map) {
			map.getContainer().focus();

			this._featureGroup.eachLayer(this._enableLayerEdit, this);

			this._tooltip = new L.Draw.Tooltip(this._map);
			this._tooltip.updateContent({
				text: L.drawLocal.edit.handlers.edit.tooltip.text,
				subtext: L.drawLocal.edit.handlers.edit.tooltip.subtext
			});

			// Quickly access the tooltip to update for intersection checking
			map._editTooltip = this._tooltip;

			this._updateTooltip();

			this._map
				.on('mousemove', this._onMouseMove, this)
				.on('touchmove', this._onMouseMove, this)
				.on('MSPointerMove', this._onMouseMove, this)
				.on(L.Draw.Event.EDITVERTEX, this._updateTooltip, this);
		}
	},

	// @method removeHooks(): void
	// Remove listener hooks for this handler
	removeHooks: function () {
		if (this._map) {
			// Clean up selected layers.
			this._featureGroup.eachLayer(this._disableLayerEdit, this);

			// Clear the backups of the original layers
			this._uneditedLayerProps = {};

			this._tooltip.dispose();
			this._tooltip = null;

			this._map
				.off('mousemove', this._onMouseMove, this)
				.off('touchmove', this._onMouseMove, this)
				.off('MSPointerMove', this._onMouseMove, this)
				.off(L.Draw.Event.EDITVERTEX, this._updateTooltip, this);
		}
	},

	// @method revertLayers(): void
	// Revert each layer's geometry changes
	revertLayers: function () {
		this._featureGroup.eachLayer(function (layer) {
			this._revertLayer(layer);
		}, this);
	},

	// @method save(): void
	// Save the layer geometries
	save: function () {
		var editedLayers = new L.LayerGroup();
		this._featureGroup.eachLayer(function (layer) {
			if (layer.edited) {
				editedLayers.addLayer(layer);
				layer.edited = false;
			}
		});
		this._map.fire(L.Draw.Event.EDITED, { layers: editedLayers });
	},

	_backupLayer: function (layer) {
		var id = L.Util.stamp(layer);

		if (!this._uneditedLayerProps[id]) {
			// Polyline, Polygon or Rectangle
			if (layer instanceof L.Polyline || layer instanceof L.Polygon || layer instanceof L.Rectangle) {
				this._uneditedLayerProps[id] = {
					latlngs: L.LatLngUtil.cloneLatLngs(layer.getLatLngs())
				};
			} else if (layer instanceof L.Circle) {
				this._uneditedLayerProps[id] = {
					latlng: L.LatLngUtil.cloneLatLng(layer.getLatLng()),
					radius: layer.getRadius()
				};
			} else if (layer instanceof L.Marker) { // Marker
				this._uneditedLayerProps[id] = {
					latlng: L.LatLngUtil.cloneLatLng(layer.getLatLng())
				};
			}
		}
	},

	_getTooltipText: function () {
		return ({
			text: L.drawLocal.edit.handlers.edit.tooltip.text,
			subtext: L.drawLocal.edit.handlers.edit.tooltip.subtext
		});
	},

	_updateTooltip: function () {
		this._tooltip.updateContent(this._getTooltipText());
	},

	_revertLayer: function (layer) {
		var id = L.Util.stamp(layer);
		layer.edited = false;
		if (this._uneditedLayerProps.hasOwnProperty(id)) {
			// Polyline, Polygon or Rectangle
			if (layer instanceof L.Polyline || layer instanceof L.Polygon || layer instanceof L.Rectangle) {
				layer.setLatLngs(this._uneditedLayerProps[id].latlngs);
			} else if (layer instanceof L.Circle) {
				layer.setLatLng(this._uneditedLayerProps[id].latlng);
				layer.setRadius(this._uneditedLayerProps[id].radius);
			} else if (layer instanceof L.Marker) { // Marker
				layer.setLatLng(this._uneditedLayerProps[id].latlng);
			}

			layer.fire('revert-edited', { layer: layer });
		}
	},

	_enableLayerEdit: function (e) {
		var layer = e.layer || e.target || e,
			pathOptions, poly;

		// Back up this layer (if haven't before)
		this._backupLayer(layer);

		if (this.options.poly) {
			poly = L.Util.extend({}, this.options.poly);
			layer.options.poly = poly;
		}

		// Set different style for editing mode
		if (this.options.selectedPathOptions) {
			pathOptions = L.Util.extend({}, this.options.selectedPathOptions);

			// Use the existing color of the layer
			if (pathOptions.maintainColor) {
				pathOptions.color = layer.options.color;
				pathOptions.fillColor = layer.options.fillColor;
			}

			layer.options.original = L.extend({}, layer.options);
			layer.options.editing = pathOptions;

		}

		if (layer instanceof L.Marker) {
			if (layer.editing) {
				layer.editing.enable();
			}
			layer.dragging.enable();
			layer
				.on('dragend', this._onMarkerDragEnd)
				// #TODO: remove when leaflet finally fixes their draggable so it's touch friendly again.
				.on('touchmove', this._onTouchMove, this)
				.on('MSPointerMove', this._onTouchMove, this)
				.on('touchend', this._onMarkerDragEnd, this)
				.on('MSPointerUp', this._onMarkerDragEnd, this);
		} else {
			layer.editing.enable();
		}
	},

	_disableLayerEdit: function (e) {
		var layer = e.layer || e.target || e;

		layer.edited = false;
		if (layer.editing) {
			layer.editing.disable();
		}

		delete layer.options.editing;
		delete layer.options.original;
		// Reset layer styles to that of before select
		if (this._selectedPathOptions) {
			if (layer instanceof L.Marker) {
				this._toggleMarkerHighlight(layer);
			} else {
				// reset the layer style to what is was before being selected
				layer.setStyle(layer.options.previousOptions);
				// remove the cached options for the layer object
				delete layer.options.previousOptions;
			}
		}

		if (layer instanceof L.Marker) {
			layer.dragging.disable();
			layer
				.off('dragend', this._onMarkerDragEnd, this)
				.off('touchmove', this._onTouchMove, this)
				.off('MSPointerMove', this._onTouchMove, this)
				.off('touchend', this._onMarkerDragEnd, this)
				.off('MSPointerUp', this._onMarkerDragEnd, this);
		} else {
			layer.editing.disable();
		}
	},

	_onMouseMove: function (e) {
		this._tooltip.updatePosition(e.latlng);
	},

	_onMarkerDragEnd: function (e) {
		var layer = e.target;
		layer.edited = true;
		this._map.fire(L.Draw.Event.EDITMOVE, { layer: layer });
	},

	_onTouchMove: function (e) {
		var touchEvent = e.originalEvent.changedTouches[0],
			layerPoint = this._map.mouseEventToLayerPoint(touchEvent),
			latlng = this._map.layerPointToLatLng(layerPoint);
		e.target.setLatLng(latlng);
	},

	_hasAvailableLayers: function () {
		return this._featureGroup.getLayers().length !== 0;
	}
});

/**
 * @class L.EditToolbar.Delete
 * @aka EditToolbar.Delete
 */
L.EditToolbar.Delete = L.Handler.extend({
	statics: {
		TYPE: 'remove' // not delete as delete is reserved in js
	},

	includes: L.Mixin.Events,

	// @method intialize(): void
	initialize: function (map, options) {
		L.Handler.prototype.initialize.call(this, map);

		L.Util.setOptions(this, options);

		// Store the selectable layer group for ease of access
		this._deletableLayers = this.options.featureGroup;

		if (!(this._deletableLayers instanceof L.FeatureGroup)) {
			throw new Error('options.featureGroup must be a L.FeatureGroup');
		}

		// Save the type so super can fire, need to do this as cannot do this.TYPE :(
		this.type = L.EditToolbar.Delete.TYPE;
	},

	// @method enable(): void
	// Enable the delete toolbar
	enable: function () {
		if (this._enabled || !this._hasAvailableLayers()) {
			return;
		}
		this.fire('enabled', { handler: this.type });

		this._map.fire(L.Draw.Event.DELETESTART, { handler: this.type });

		L.Handler.prototype.enable.call(this);

		this._deletableLayers
			.on('layeradd', this._enableLayerDelete, this)
			.on('layerremove', this._disableLayerDelete, this);
	},

	// @method disable(): void
	// Disable the delete toolbar
	disable: function () {
		if (!this._enabled) {
			return;
		}

		this._deletableLayers
			.off('layeradd', this._enableLayerDelete, this)
			.off('layerremove', this._disableLayerDelete, this);

		L.Handler.prototype.disable.call(this);

		this._map.fire(L.Draw.Event.DELETESTOP, { handler: this.type });

		this.fire('disabled', { handler: this.type });
	},

	// @method addHooks(): void
	// Add listener hooks to this handler
	addHooks: function () {
		var map = this._map;

		if (map) {
			map.getContainer().focus();

			this._deletableLayers.eachLayer(this._enableLayerDelete, this);
			this._deletedLayers = new L.LayerGroup();

			this._tooltip = new L.Draw.Tooltip(this._map);
			this._tooltip.updateContent({ text: L.drawLocal.edit.handlers.remove.tooltip.text });

			this._map.on('mousemove', this._onMouseMove, this);
		}
	},

	// @method removeHooks(): void
	// Remove listener hooks from this handler
	removeHooks: function () {
		if (this._map) {
			this._deletableLayers.eachLayer(this._disableLayerDelete, this);
			this._deletedLayers = null;

			this._tooltip.dispose();
			this._tooltip = null;

			this._map.off('mousemove', this._onMouseMove, this);
		}
	},

	// @method revertLayers(): void
	// Revert the deleted layers back to their prior state.
	revertLayers: function () {
		// Iterate of the deleted layers and add them back into the featureGroup
		this._deletedLayers.eachLayer(function (layer) {
			this._deletableLayers.addLayer(layer);
			layer.fire('revert-deleted', { layer: layer });
		}, this);
	},

	// @method save(): void
	// Save deleted layers
	save: function () {
		this._map.fire(L.Draw.Event.DELETED, { layers: this._deletedLayers });
	},

	_enableLayerDelete: function (e) {
		var layer = e.layer || e.target || e;

		layer.on('click', this._removeLayer, this);
	},

	_disableLayerDelete: function (e) {
		var layer = e.layer || e.target || e;

		layer.off('click', this._removeLayer, this);

		// Remove from the deleted layers so we can't accidentally revert if the user presses cancel
		this._deletedLayers.removeLayer(layer);
	},

	_removeLayer: function (e) {
		var layer = e.layer || e.target || e;

		this._deletableLayers.removeLayer(layer);

		this._deletedLayers.addLayer(layer);

		layer.fire('deleted');
	},

	_onMouseMove: function (e) {
		this._tooltip.updatePosition(e.latlng);
	},

	_hasAvailableLayers: function () {
		return this._deletableLayers.getLayers().length !== 0;
	}
});