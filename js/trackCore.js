/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


// Generic functions applicable to all track types

var igv = (function (igv) {
    var list;

    list =
        [
            "narrowpeak",
            "broadpeak",
            "peaks",
            "bedgraph",
            "wig",
            "gff3",
            "gff",
            "gtf",
            "fusionjuncspan",
            "refflat",
            "seg",
            "aed",
            "bed",
            "vcf",
            "bb",
            "bigbed",
            "bw",
            "bigwig",
            "bam",
            "tdf",
            "refgene",
            "genepred",
            "genepredext",
            "bedpe"
        ];

    igv.knownFileExtensions = new Set(list);

    /**
     * Return a custom format object with the given name.
     * @param name
     * @returns {*}
     */
    igv.getFormat = function (name) {

        if (undefined === igv.browser || undefined === igv.browser.formats) {
            return undefined;
        } else {
            return igv.browser.formats[name];
        }

    };

    igv.createTrack = function (config, browser) {

        // Lowercase format
        if(config.format) {
            config.format = config.format.toLowerCase();
        }


        const type = (undefined === config.type) ? 'unknown_type' : config.type.toLowerCase();

        // add browser to track config
        let trackConfig = Object.assign({}, config);
        trackConfig.browser = browser;

        switch (type) {

            case "gwas":
                return new igv.GWASTrack(trackConfig);
                break;

            case "annotation":
            case "genes":
            case "fusionjuncspan":
            case "snp":
                return new igv.FeatureTrack(trackConfig, browser);
                break;

            case "variant":
                return new igv.VariantTrack(trackConfig, browser);
                break;

            case "alignment":
                return new igv.BAMTrack(trackConfig, browser);
                break;

            case "data":  // deprecated
            case "wig":
                return new igv.WIGTrack(trackConfig, browser);
                break;

            case "sequence":
                return new igv.SequenceTrack(trackConfig, browser);
                break;

            case "eqtl":
                return new igv.EqtlTrack(trackConfig, browser);
                break;

            case "seg":
                return new igv.SegTrack(trackConfig, browser);
                break;

            case "merged":
                return new igv.MergedTrack(trackConfig, browser);

            case "interaction":
                return new igv.InteractionTrack(trackConfig, browser);

            default:
                return undefined;
        }

    };

    igv.inferTrackTypes = function (config) {

        function translateDeprecatedTypes(config) {

            if (config.featureType) {  // Translate deprecated "feature" type
                config.type = config.type || config.featureType;
                config.featureType = undefined;
            }

            if ("bed" === config.type) {
                config.type = "annotation";
                config.format = config.format || "bed";

            }

            else if ("bam" === config.type) {
                config.type = "alignment";
                config.format = "bam"
            }

            else if ("vcf" === config.type) {
                config.type = "variant";
                config.format = "vcf"
            }

            else if ("t2d" === config.type) {
                config.type = "gwas";
            }

            else if ("FusionJuncSpan" === config.type && !config.format) {
                config.format = "fusionjuncspan";
            }

            else if ("aed" === config.type) {
                config.type = "annotation";
                config.format = config.format || "aed";
            }
        }

        function inferFileFormat(config) {

            var path;

            if (config.format) {
                config.format = config.format.toLowerCase();
                return;
            }

            path = igv.isFilePath(config.url) ? config.url.name : config.url;

            config.format = igv.inferFileFormat(path);
        }

        function inferTrackType(config) {

            if (config.type) return;

            if (config.format) {
                switch (config.format.toLowerCase()) {
                    case "bw":
                    case "bigwig":
                    case "wig":
                    case "bedgraph":
                    case "tdf":
                        config.type = "wig";
                        break;
                    case "vcf":
                        config.type = "variant";
                        break;
                    case "seg":
                        config.type = "seg";
                        break;
                    case "bam":
                        config.type = "alignment";
                        break;
                    case "bedpe":
                    case "bedpe-loop":
                        config.type = "interaction";
                        break;
                    default:
                        config.type = "annotation";
                }
            }
        }

        translateDeprecatedTypes(config);

        if (undefined === config.sourceType && config.url) {
            config.sourceType = "file";
        }

        if ("file" === config.sourceType) {
            if (undefined === config.format) {
                inferFileFormat(config);
            }
        }

        if (undefined === config.type) {
            inferTrackType(config);
        }


    };

    igv.inferFileFormat = function (fn) {

        var idx, ext;

        fn = fn.toLowerCase();

        // Special case -- UCSC refgene files
        if (fn.endsWith("refgene.txt.gz") || fn.endsWith("refgene.txt")) {
            return "refgene";
            return;
        }


        //Strip parameters -- handle local files later
        idx = fn.indexOf("?");
        if (idx > 0) {
            fn = fn.substr(0, idx);
        }

        //Strip aux extensions .gz, .tab, and .txt
        if (fn.endsWith(".gz")) {
            fn = fn.substr(0, fn.length - 3);
        }

        if (fn.endsWith(".txt") || fn.endsWith(".tab")) {
            fn = fn.substr(0, fn.length - 4);
        }


        idx = fn.lastIndexOf(".");
        ext = idx < 0 ? fn : fn.substr(idx + 1);

        switch (ext) {
            case "bw":
                return "bigwig";
            case "bb":
                return "bigbed";

            default:
                if (igv.knownFileExtensions.has(ext)) {
                    return ext;
                }
                else {
                    return undefined;
                }
        }

    };

    /**
     * Set defaults for properties applicable to all tracks.
     * Insure required "config" properties are set.
     * @param track
     * @param config
     */
    igv.configTrack = function (track, config) {

        track.config = config;
        track.url = config.url;

        config.name = config.name || config.label;   // synonym for name, label is deprecated
        if (config.name) {
            track.name = config.name;
        }
        else {
            if (igv.isFilePath(config.url)) track.name = config.url.name;
            else track.name = config.url;

        }

        track.id = config.id || track.name;   // TODO -- remove this property, not used

        track.order = config.order;
        track.color = config.color || track.config.browser.constants.defaultColor || "rgb(0,0,150)";

        track.autoscaleGroup = config.autoscaleGroup;

        track.removable = config.removable === undefined ? true : config.removable;      // Defaults to true

        track.height = config.height || 100;

        if (config.autoHeight === undefined)  {
            config.autoHeight = config.autoheight;
        } // Some case confusion in the initial releasae

        track.autoHeight = config.autoHeight === undefined ? (config.height === undefined) : config.autoHeight;
        track.minHeight = config.minHeight || Math.min(25, track.height);
        track.maxHeight = config.maxHeight || Math.max(1000, track.height);

        track.visibilityWindow = config.visibilityWindow;

        if (track.type === undefined) {
            track.type = config.type;
        }

        // Define some default base functions and properties common to all tracks.   
        Object.keys(baseProperties).forEach(function (key) {
            {
                if (undefined === track[key]) {
                    track[key] = baseProperties[key];
                }
            }
        });

    };

    igv.setTrackLabel = function ($label, track, label) {

        var vp,
            txt;

        track.name = label;
        track.config.name = label;

        $label.empty();
        $label.html(track.name);
        txt = $label.text();
        $label.attr('title', txt);
    };

    igv.getTrackLabelText = function (track) {
        var vp,
            txt;

        vp = track.trackView.viewports[0];
        txt = vp.$trackLabel.text();

        return txt;
    };

    igv.inferIndexPath = function (url, extension) {

        var path, idx;

        if (url instanceof File) {
            throw new Error("Cannot infer an index path for a local File.  Please select explicitly")
        }

        if (url.includes("?")) {
            idx = url.indexOf("?");
            return url.substring(0, idx) + "." + extension + url.substring(idx);
        } else {
            return url + "." + extension;
        }


    };

    igv.paintAxis = function (ctx, pixelWidth, pixelHeight) {

        var x1,
            x2,
            y1,
            y2,
            a,
            b,
            reference,
            shim,
            font = {
                'font': 'normal 10px Arial',
                'textAlign': 'right',
                'strokeStyle': "black"
            };

        if (undefined === this.dataRange || undefined === this.dataRange.max || undefined === this.dataRange.min) {
            return;
        }

        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        reference = 0.95 * pixelWidth;
        x1 = reference - 8;
        x2 = reference;

        //shim = 0.5 * 0.125;
        shim = .01;
        y1 = y2 = shim * pixelHeight;

        a = {x: x2, y: y1};

        // tick
        igv.graphics.strokeLine(ctx, x1, y1, x2, y2, font);
        igv.graphics.fillText(ctx, prettyPrint(this.dataRange.max), x1 + 4, y1 + 12, font);

        //shim = 0.25 * 0.125;
        y1 = y2 = (1.0 - shim) * pixelHeight;

        b = {x: x2, y: y1};

        // tick
        igv.graphics.strokeLine(ctx, x1, y1, x2, y2, font);
        igv.graphics.fillText(ctx, prettyPrint(this.dataRange.min), x1 + 4, y1 - 4, font);

        igv.graphics.strokeLine(ctx, a.x, a.y, b.x, b.y, font);

        function prettyPrint(number) {
            // if number >= 100, show whole number
            // if >= 1 show 1 significant digits
            // if <  1 show 2 significant digits

            if (number === 0) {
                return "0";
            } else if (Math.abs(number) >= 10) {
                return number.toFixed();
            } else if (Math.abs(number) >= 1) {
                return number.toFixed(1);
            } else {
                return number.toFixed(2);
            }
        }

    };

    /**
     * Configure item list for contextual (right-click) track popup menu.
     * @param viewport
     * @param genomicLocation - (bp)
     * @param xOffset - (pixels) within track extent
     * @param yOffset - (pixels) within track extent
     */
    igv.trackContextMenuItemList = function (viewport, genomicLocation, xOffset, yOffset) {

        var config,
            menuItems;

        config =
        {
            viewport: viewport,
            genomicState: viewport.genomicState,
            genomicLocation: genomicLocation,
            x: xOffset,
            y: yOffset
        };

        menuItems = [];
        if (typeof viewport.trackView.track.contextMenuItemList === "function") {
            menuItems = viewport.trackView.track.contextMenuItemList(config);
        }

        return menuItems;
    };

    /**
     * Configure item list for track "gear" menu.
     * @param popover
     * @param trackView
     */
    igv.trackMenuItemList = function (popover, trackView) {

        const vizWindowTypes = new Set(['alignment', 'annotation', 'variant']);

        let menuItems = [];

        if (trackView.track.config.type !== 'sequence') {
            menuItems.push(igv.trackRenameMenuItem(trackView));
            menuItems.push(igv.trackHeightMenuItem(trackView));
        }

        if (doProvideColoSwatchWidget(trackView.track)) {
            menuItems.push(igv.colorPickerMenuItem(trackView))
        }

        if (trackView.track.menuItemList) {
            menuItems = menuItems.concat(trackView.track.menuItemList());
        }

        if (vizWindowTypes.has(trackView.track.config.type)) {
            menuItems.push('<hr/>');
            menuItems.push(igv.visibilityWindowMenuItem(trackView));
        }

        if (trackView.track.removable !== false) {
            menuItems.push('<hr/>');
            menuItems.push(igv.trackRemovalMenuItem(trackView));
        }

        return menuItems;
    };

    function doProvideColoSwatchWidget(track) {
        return (track instanceof igv.BAMTrack || track instanceof igv.FeatureTrack || track instanceof igv.VariantTrack || track instanceof igv.WIGTrack);
    };

    igv.trackMenuItemListHelper = function (itemList, $popover) {

        var list = [];

        if (itemList.length > 0) {

            list = itemList.map(function (item, i) {
                var $e;

                // name and object fields checked for backward compatibility
                if (item.name) {
                    $e = $('<div>');
                    $e.text(item.name);
                } else if (item.object) {
                    $e = item.object
                }
                else if (typeof item.label === 'string') {
                    $e = $('<div>');
                    $e.text(item.label)
                }
                else {
                    $e = $(item.label);
                }

                if (0 === i) {
                    $e.addClass('igv-track-menu-border-top');
                }

                if (item.click) {
                    $e.click(function () {
                        item.click();
                        $popover.hide();
                    });
                }

                return {object: $e, init: (item.init || undefined)};
            });
        }

        return list;
    };

    /**
     * Configure item for track "gear" menu.
     * @param trackView
     * @param menuItemLabel - menu item string
     * @param dialogLabelHandler - dialog label creation handler
     * @param dialogInputValue
     * @param dialogClickHandler
     */
    igv.trackMenuItem = function (trackView, menuItemLabel, dialogLabelHandler, dialogInputValue, dialogClickHandler) {

        var $e,
            clickHandler;

        $e = $('<div>');

        $e.text(menuItemLabel);

        clickHandler = function () {

            trackView.browser.inputDialog.configure(dialogLabelHandler, dialogInputValue, dialogClickHandler, undefined, undefined);
            trackView.browser.inputDialog.show($(trackView.trackDiv));

        };

        return {object: $e, click: clickHandler};
    };

    igv.visibilityWindowMenuItem = function (trackView) {

        var $e,
            menuClickHandler;

        menuClickHandler = function () {

            var dialogClickHandler;

            dialogClickHandler = function () {
                var value;

                value = trackView.browser.inputDialog.$input.val().trim();

                if ('' === value || undefined === value) {
                    value = -1;
                }

                trackView.track.visibilityWindow = value;
                trackView.updateViews();
            };

            trackView.browser.inputDialog.configure({
                label: 'Visibility Window',
                input: (trackView.track.visibilityWindow),
                click: dialogClickHandler
            });
            trackView.browser.inputDialog.present($(trackView.trackDiv));

        };

        $e = $('<div>');
        $e.text('Set visibility window');

        return {object: $e, click: menuClickHandler};


    };

    igv.trackRemovalMenuItem = function (trackView) {

        var $e,
            menuClickHandler;

        $e = $('<div>');
        $e.addClass('igv-track-menu-border-top');
        $e.text('Remove track');

        menuClickHandler = function () {
            trackView.browser.removeTrack(trackView.track);
        };

        return {object: $e, click: menuClickHandler};

    };

    igv.dataRangeMenuItem = function (trackView) {

        var $e,
            clickHandler;

        $e = $('<div>');
        $e.text('Set data range');

        clickHandler = function () {
            trackView.browser.dataRangeDialog.configure({trackView: trackView});
            trackView.browser.dataRangeDialog.present($(trackView.trackDiv));
        };

        return {object: $e, click: clickHandler};
    };

    igv.colorPickerMenuItem = function (trackView) {
        var $e,
            clickHandler;

        $e = $('<div>');
        $e.text('Set track color');

        clickHandler = function () {
            trackView.$colorpicker_container.toggle();
        };

        return {object: $e, click: clickHandler};

    };

    igv.trackRenameMenuItem = function (trackView) {

        var $e,
            menuClickHandler;

        $e = $('<div>');
        $e.text('Set track name');

        menuClickHandler = function () {

            var dialogClickHandler;

            dialogClickHandler = function () {
                var value;

                value = trackView.browser.inputDialog.$input.val().trim();

                value = ('' === value || undefined === value) ? 'untitled' : value;

                igv.setTrackLabel(trackView.viewports[0].$trackLabel, trackView.track, value);
            };

            trackView.browser.inputDialog.configure({
                label: 'Track Name',
                input: (igv.getTrackLabelText(trackView.track) || 'unnamed'),
                click: dialogClickHandler
            });
            trackView.browser.inputDialog.present($(trackView.trackDiv));

        };

        return {object: $e, click: menuClickHandler};


    };

    igv.trackHeightMenuItem = function (trackView) {

        var $e,
            menuClickHandler;

        $e = $('<div>');
        $e.text('Set track height');

        menuClickHandler = function () {
            var dialogClickHandler;

            dialogClickHandler = function () {

                var number;

                number = parseFloat(trackView.browser.inputDialog.$input.val(), 10);

                if (undefined !== number) {

                    // If explicitly setting the height adust min or max, if neccessary.
                    if (trackView.track.minHeight !== undefined && trackView.track.minHeight > number) {
                        trackView.track.minHeight = number;
                    }
                    if (trackView.track.maxHeight !== undefined && trackView.track.maxHeight < number) {
                        trackView.track.minHeight = number;
                    }
                    trackView.setTrackHeight(number, true, true);

                    // Explicitly setting track height turns off autoHeight
                    trackView.track.autoHeight = false;
                }

            };

            trackView.browser.inputDialog.configure({
                label: 'Track Height',
                input: trackView.trackDiv.clientHeight,
                click: dialogClickHandler
            });
            trackView.browser.inputDialog.present($(trackView.trackDiv));

        };

        return {object: $e, click: menuClickHandler};


    };

    igv.hasVisibilityWindow = function (trackOrFeatureSource) {
        return !(-1 === trackOrFeatureSource.visibilityWindow);
    };


    const baseProperties = {
        /**
         * Default implementation -- return the current state of the "this" object, which should be a track.  Used
         * to create session object for bookmarking, sharing.  Updates the track "config" object to reflect the
         * current state.  Only simple properties (string, number, boolean) are updated.
         */
        getState: function () {

            const config = this.config;
            const self = this;

            Object.keys(config).forEach(function (key) {
                const value = self[key];
                if (value && (igv.isSimpleType(value) || typeof value === "boolean")) {
                    config[key] = value;
                }
            })

            return config;
        },

        clickedFeatures: function (clickState) {

            // We use the cached features rather than method to avoid async load.  If the
            // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
            const features = clickState.viewport.getCachedFeatures();

            if (!features || features.length === 0) {
                return [];
            }

            const genomicLocation = clickState.genomicLocation;

            // We need some tolerance around genomicLocation
            const tolerance = 3 * clickState.referenceFrame.bpPerPixel;
            const ss = genomicLocation - tolerance;
            const ee = genomicLocation + tolerance;

            return (igv.FeatureUtils.findOverlapping(features, ss, ee));
        },

        supportsWholeGenome: function () {
            return false;
        }
    }

    return igv;
})(igv || {});
