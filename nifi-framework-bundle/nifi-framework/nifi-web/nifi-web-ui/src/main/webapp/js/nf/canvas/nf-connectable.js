/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global define, module, require, exports */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['d3',
                'nf.Connection',
                'nf.ConnectionConfiguration',
                'nf.CanvasUtils',
                'nf.ng.D3Helpers'],
            function (d3, nfConnection, nfConnectionConfiguration, nfCanvasUtils, d3Helpers) {
                return (nf.Connectable = factory(d3, nfConnection, nfConnectionConfiguration, nfCanvasUtils, d3Helpers));
            });
    } else if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = (nf.Connectable =
            factory(require('d3'),
                require('nf.Connection'),
                require('nf.ConnectionConfiguration'),
                require('nf.CanvasUtils'),
                require('nf.ng.D3Helpers')));
    } else {
        nf.Connectable = factory(root.d3,
            root.nf.Connection,
            root.nf.ConnectionConfiguration,
            root.nf.CanvasUtils,
            root.nf.ng.D3Helpers);
    }
}(this, function (d3, nfConnection, nfConnectionConfiguration, nfCanvasUtils, d3Helpers) {
    'use strict';

    var connect;
    var canvas;
    var origin;

    var config = {
            urls: {
                api: '../nifi-api',
            }
        };

    /**
     * Determines if we want to allow adding connections in the current state:
     *
     * 1) When shift is down, we could be adding components to the current selection.
     * 2) When the selection box is visible, we are in the process of moving all the
     * components currently selected.
     * 3) When the drag selection box is visible, we are in the process or selecting components
     * using the selection box.
     *
     * @returns {boolean}
     */
    var allowConnection = function (event) {
        return !event.shiftKey && d3.select('rect.drag-selection').empty() && d3.select('rect.component-selection').empty();
    };

    return {
        init: function () {
            canvas = d3.select('#canvas');

            // dragging behavior for the connector
            connect = d3.drag()
                .subject(function (event, d) {
                    origin = d3.pointer(event, canvas.node());
                    return {
                        x: origin[0],
                        y: origin[1]
                    };
                })
                .on('start', function (event) {
                    // stop further propagation
                    event.sourceEvent.stopPropagation();

                    // unselect the previous components
                    nfCanvasUtils.getSelection().classed('selected', false);

                    // mark the source component has selected
                    var source = d3.select(this.parentNode).classed('selected', true);

                    // mark this component as dragging and selected
                    d3.select(this).classed('dragging', true);

                    // mark the source of the drag
                    var sourceData = source.datum();

                    // start the drag line and insert it first to keep it on the bottom
                    const position = d3.pointer(event, canvas.node());
                    d3Helpers.multiAttr(
                        canvas.insert('path', ':first-child')
                            .datum({
                                sourceId: sourceData.id,
                                sourceWidth: sourceData.dimensions.width / 2,
                                x: sourceData.position.x + (sourceData.dimensions.width / 2),
                                y: sourceData.position.y + (sourceData.dimensions.height / 2)
                            }),
                        {
                            'class': 'connector',
                            'd': function (pathDatum) {
                                return 'M' + pathDatum.x + ' ' + pathDatum.y + 'L' + pathDatum.x + ' ' + pathDatum.y;
                            }
                        }
                    );

                    // updates the location of the connection img
                    d3.select(this).attr('transform', function () {
                        return 'translate(' + position[0] + ', ' + (position[1] + 20) + ')';
                    });

                    // re-append the image to keep it on top
                    canvas.node().appendChild(this);
                })
                .on('drag', function (event) {
                    // updates the location of the connection img
                    d3.select(this).attr('transform', function () {
                        return 'translate(' + event.x + ', ' + (event.y + 50) + ')';
                    });

                    // mark node's connectable if supported
                    var destination = d3.select('g.hover').classed('connectable-destination', function () {
                        // ensure the mouse has moved at least 10px in any direction, it seems that
                        // when the drag event is trigger is not consistent between browsers. as a result
                        // some browser would trigger when the mouse hadn't moved yet which caused
                        // click and contextmenu events to appear like an attempt to connection the
                        // component to itself. requiring the mouse to have actually moved before
                        // checking the eligiblity of the destination addresses the issue
                        return (Math.abs(origin[0] - event.x) > 10 || Math.abs(origin[1] - event.y) > 10) &&
                            nfCanvasUtils.isValidConnectionDestination(d3.select(this));
                    });

                    // update the drag line
                    d3.select('path.connector').classed('connectable', function () {
                        if (destination.empty()) {
                            return false;
                        }

                        // if there is a potential destination, see if its connectable
                        return destination.classed('connectable-destination');
                    }).attr('d', function (pathDatum) {
                        if (!destination.empty() && destination.classed('connectable-destination')) {
                            var destinationData = destination.datum();

                            // show the line preview as appropriate
                            if (pathDatum.sourceId === destinationData.id) {
                                var x = pathDatum.x;
                                var y = pathDatum.y;
                                var componentOffset = pathDatum.sourceWidth / 2;
                                var xOffset = nfConnection.config.selfLoopXOffset;
                                var yOffset = nfConnection.config.selfLoopYOffset;
                                return 'M' + x + ' ' + y + 'L' + (x + componentOffset + xOffset) + ' ' + (y - yOffset) + 'L' + (x + componentOffset + xOffset) + ' ' + (y + yOffset) + 'Z';
                            } else {
                                // get the position on the destination perimeter
                                var end = nfCanvasUtils.getPerimeterPoint(pathDatum, {
                                    'x': destinationData.position.x,
                                    'y': destinationData.position.y,
                                    'width': destinationData.dimensions.width,
                                    'height': destinationData.dimensions.height
                                });

                                // direct line between components to provide a 'snap feel'
                                return 'M' + pathDatum.x + ' ' + pathDatum.y + 'L' + end.x + ' ' + end.y;
                            }
                        } else {
                            return 'M' + pathDatum.x + ' ' + pathDatum.y + 'L' + event.x + ' ' + event.y;
                        }
                    });
                })
                .on('end', function (event, d) {
                    // stop further propagation
                    event.sourceEvent.stopPropagation();

                    // get the add connect img
                    var addConnect = d3.select(this);

                    // get the connector, if it the current point is not over a new destination
                    // the connector will be removed. otherwise it will be removed after the
                    // connection has been configured/cancelled
                    var connector = d3.select('path.connector');
                    var connectorData = connector.datum();

                    // get the destination
                    var destination = d3.select('g.connectable-destination');

                    // we are not over a new destination
                    if (destination.empty()) {
                        // get the source to determine if we are still over it
                        var source = d3.select('#id-' + connectorData.sourceId);
                        var sourceData = source.datum();

                        // get the mouse position relative to the source
                        var position = d3.pointer(event, source.node());

                        // if the position is outside the component, remove the add connect img
                        if (position[0] < 0 || position[0] > sourceData.dimensions.width || position[1] < 0 || position[1] > sourceData.dimensions.height) {
                            addConnect.remove();
                        } else {
                            // reset the add connect img by restoring the position and place in the DOM
                            addConnect.classed('dragging', false).attr('transform', function () {
                                return 'translate(' + d.origX + ', ' + d.origY + ')';
                            });
                            source.node().appendChild(this);
                        }

                        // remove the connector
                        connector.remove();
                    } else {
                        // remove the add connect img
                        addConnect.remove();

                        // create the connection
                        var destinationData = destination.datum();

                        $.ajax({
                            type: 'GET',
                            url: config.urls.api + '/process-groups/' + encodeURIComponent(destinationData.component.parentGroupId),
                            dataType: 'json'
                        }).done(function (response) {
                            var defaultSettings = {
                                flowfileExpiration: response.component.defaultFlowFileExpiration,
                                objectThreshold: response.component.defaultBackPressureObjectThreshold,
                                dataSizeThreshold: response.component.defaultBackPressureDataSizeThreshold,
                            };
                            nfConnectionConfiguration.createConnection(connectorData.sourceId, destinationData.id, defaultSettings);
                        });
                    }
                });
        },

        /**
         * Activates the connect behavior for the components in the specified selection.
         *
         * @param {selection} components
         */
        activate: function (components) {
            components
                .classed('connectable', true)
                .on('mouseenter.connectable', function (event, d) {
                    if (allowConnection(event)) {
                        var selection = d3.select(this);

                        // ensure the current component supports connection source
                        if (nfCanvasUtils.isValidConnectionSource(selection)) {
                            // see if theres already a connector rendered
                            var addConnect = d3.select('text.add-connect');
                            if (addConnect.empty()) {
                                var x = (d.dimensions.width / 2) - 14;
                                var y = (d.dimensions.height / 2) + 14;

                                selection
                                    .append('text')
                                    .attr('class', 'add-connect')
                                    .attr('transform', 'translate(' + x + ', ' + y + ')')
                                    .text('\ue834')
                                    .datum({
                                        origX: x,
                                        origY: y
                                    })
                                    .call(connect)
                            }
                        }
                    }
                })
                .on('mouseleave.connectable', function () {
                    // conditionally remove the connector
                    var addConnect = d3.select(this).select('text.add-connect');
                    if (!addConnect.empty() && !addConnect.classed('dragging')) {
                        addConnect.remove();
                    }
                })
                // Using mouseover/out to workaround chrome issue #122746
                .on('mouseover.connectable', function () {
                    // mark that we are hovering when appropriate
                    d3.select(this).classed('hover', function (event) {
                        return allowConnection(event);
                    });
                })
                .on('mouseout.connection', function () {
                    // remove all hover related classes
                    d3.select(this).classed('hover connectable-destination', false);
                });
        },

        /**
         * Deactivates the connect behavior for the components in the specified selection.
         *
         * @param {selection} components
         */
        deactivate: function (components) {
            components
                .classed('connectable', false)
                .on('mouseenter.connectable', null)
                .on('mouseleave.connectable', null)
                .on('mouseover.connectable', null)
                .on('mouseout.connectable', null);
        }
    };
}));
