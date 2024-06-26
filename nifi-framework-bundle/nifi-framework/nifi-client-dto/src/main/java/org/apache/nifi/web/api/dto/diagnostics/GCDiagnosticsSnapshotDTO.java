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

package org.apache.nifi.web.api.dto.diagnostics;

import java.util.Date;

import jakarta.xml.bind.annotation.XmlType;

import io.swagger.v3.oas.annotations.media.Schema;

@XmlType(name = "gcDiagnosticsSnapshot")
public class GCDiagnosticsSnapshotDTO implements Cloneable {
    private Date timestamp;
    private Long collectionCount;
    private Long collectionMillis;

    @Schema(description = "The timestamp of when the Snapshot was taken")
    public Date getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Date timestamp) {
        this.timestamp = timestamp;
    }

    @Schema(description = "The number of times that Garbage Collection has occurred")
    public Long getCollectionCount() {
        return collectionCount;
    }

    public void setCollectionCount(Long collectionCount) {
        this.collectionCount = collectionCount;
    }

    @Schema(description = "The number of milliseconds that the Garbage Collector spent performing Garbage Collection duties")
    public Long getCollectionMillis() {
        return collectionMillis;
    }

    public void setCollectionMillis(Long collectionMillis) {
        this.collectionMillis = collectionMillis;
    }

    @Override
    public GCDiagnosticsSnapshotDTO clone() {
        final GCDiagnosticsSnapshotDTO clone = new GCDiagnosticsSnapshotDTO();
        clone.timestamp = timestamp;
        clone.collectionCount = collectionCount;
        clone.collectionMillis = collectionMillis;
        return clone;
    }
}
