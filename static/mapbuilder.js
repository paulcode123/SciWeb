let network = null;
let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let selectedNode = null;
let currentMapId = null;

// Network configuration
const options = {
    nodes: {
        shape: 'box',
        margin: 10,
        widthConstraint: {
            minimum: 100,
            maximum: 200
        },
        font: {
            size: 14
        },
        fixed: {
            x: false,
            y: false
        }
    },
    edges: {
        arrows: 'to',
        smooth: {
            type: 'cubicBezier'
        }
    },
    manipulation: {
        enabled: true,
        addEdge: function(edgeData, callback) {
            // Prevent self-loops
            if (edgeData.from === edgeData.to) {
                return;
            }
            callback(edgeData);
            updatePrerequisites();
        }
    },
    physics: {
        enabled: false,
        stabilization: {
            enabled: true,
            iterations: 100
        }
    }
};

// Initialize the network
document.addEventListener('DOMContentLoaded', async function() {
    const container = document.getElementById('networkContainer');
    network = new vis.Network(container, { nodes, edges }, options);
    
    // Load classes into select
    await loadClasses();
    
    // Event listeners
    network.on('selectNode', onNodeSelect);
    network.on('deselectNode', onNodeDeselect);
    
    document.getElementById('addNodeBtn').addEventListener('click', addNode);
    document.getElementById('updateNodeBtn').addEventListener('click', updateNode);
    document.getElementById('deleteNodeBtn').addEventListener('click', deleteNode);
    document.getElementById('addYoutubeBtn').addEventListener('click', addYoutubeReference);
    document.getElementById('saveMapBtn').addEventListener('click', saveMap);
    document.getElementById('updateMapBtn').addEventListener('click', updateMap);
    document.getElementById('classSelect').addEventListener('change', loadMapsForClass);
    document.getElementById('mapSelect').addEventListener('change', loadSelectedMap);
});

// Load user's classes
async function loadClasses() {
    try {
        const response = await fetchRequest('/data', { 'data': 'Classes' });
        const classes = response.Classes;
        
        const select = document.getElementById('classSelect');
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

async function loadMapsForClass() {
    const classId = document.getElementById('classSelect').value;
    const unitInput = document.getElementById('unitInput');
    const mapSelect = document.getElementById('mapSelect');
    const updateMapBtn = document.getElementById('updateMapBtn');
    
    // Reset map selector and update button
    mapSelect.innerHTML = '<option value="">New Map</option>';
    updateMapBtn.disabled = true;
    currentMapId = null;
    
    // Clear the network
    nodes.clear();
    edges.clear();
    
    if (!classId) return;
    
    try {
        const response = await fetchRequest('/data', { 'data': 'CMaps' });
        const maps = response.CMaps.filter(map => map.classID === parseInt(classId));
        
        maps.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = `${map.unit}`;
            mapSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading maps:', error);
    }
}

async function loadSelectedMap() {
    const mapId = document.getElementById('mapSelect').value;
    const updateMapBtn = document.getElementById('updateMapBtn');
    const unitInput = document.getElementById('unitInput');
    
    // Clear existing network
    nodes.clear();
    edges.clear();
    
    if (!mapId) {
        updateMapBtn.disabled = true;
        currentMapId = null;
        unitInput.value = '';
        return;
    }
    
    try {
        const response = await fetchRequest('/data', { 'data': 'CMaps' });
        const map = response.CMaps.find(m => m.id === parseInt(mapId));
        
        if (map) {
            currentMapId = map.id;
            unitInput.value = map.unit;
            updateMapBtn.disabled = false;
            
            // Temporarily enable physics for layout
            network.setOptions({ physics: { enabled: true } });
            
            // Add nodes with their positions from structure
            nodes.add(map.nodes.map(node => {
                const position = map.structure?.nodes?.[node.id.toString()];
                return {
                    id: node.id,
                    label: node.label,
                    description: node.description,
                    starterPrompt: node.starter_prompt,
                    youtube: node.youtube,
                    x: position?.x,
                    y: position?.y
                };
            }));
            
            // Add edges based on prerequisites
            const newEdges = [];
            map.nodes.forEach(node => {
                if (node.prerequisites) {
                    node.prerequisites.forEach(prereqId => {
                        newEdges.push({
                            from: prereqId,
                            to: node.id
                        });
                    });
                }
            });
            edges.add(newEdges);
            
            // Only enable physics briefly if no positions are stored
            const hasPositions = map.structure?.nodes && Object.keys(map.structure.nodes).length > 0;
            if (!hasPositions) {
                setTimeout(() => {
                    network.setOptions({ physics: { enabled: false } });
                }, 1000);
            } else {
                network.setOptions({ physics: { enabled: false } });
            }
        }
    } catch (error) {
        console.error('Error loading map:', error);
    }
}

function addNode() {
    const id = generateId();
    nodes.add({
        id,
        label: 'New Node',
        description: '',
        starterPrompt: '',
        youtube: [],
        prerequisites: []
    });
}

function onNodeSelect(params) {
    if (params.nodes.length === 0) return;
    
    selectedNode = nodes.get(params.nodes[0]);
    document.getElementById('nodeLabel').value = selectedNode.label;
    document.getElementById('nodeDescription').value = selectedNode.description || '';
    document.getElementById('starterPrompt').value = selectedNode.starterPrompt || '';
    
    // Update YouTube list
    updateYoutubeList();
    
    // Update prerequisites list
    updatePrerequisitesList();
}

function onNodeDeselect() {
    selectedNode = null;
    document.getElementById('nodeLabel').value = '';
    document.getElementById('nodeDescription').value = '';
    document.getElementById('starterPrompt').value = '';
    document.getElementById('youtubeList').innerHTML = '';
    document.getElementById('prerequisitesList').innerHTML = '';
}

function updateNode() {
    if (!selectedNode) return;
    
    const updatedNode = {
        ...selectedNode,
        label: document.getElementById('nodeLabel').value,
        description: document.getElementById('nodeDescription').value,
        starterPrompt: document.getElementById('starterPrompt').value
    };
    
    nodes.update(updatedNode);
}

function deleteNode() {
    if (!selectedNode) return;
    
    nodes.remove(selectedNode.id);
    edges.remove(edges.get().filter(edge => 
        edge.from === selectedNode.id || edge.to === selectedNode.id
    ));
    selectedNode = null;
}

function addYoutubeReference() {
    if (!selectedNode) return;
    
    const link = document.getElementById('youtubeLink').value;
    const timeRange = document.getElementById('timeRange').value;
    
    if (!link) return;
    
    if (!selectedNode.youtube) {
        selectedNode.youtube = [];
    }
    
    selectedNode.youtube.push([link, timeRange]);
    nodes.update(selectedNode);
    
    document.getElementById('youtubeLink').value = '';
    document.getElementById('timeRange').value = '';
    
    updateYoutubeList();
}

function updateYoutubeList() {
    const container = document.getElementById('youtubeList');
    container.innerHTML = '';
    
    if (!selectedNode.youtube) return;
    
    selectedNode.youtube.forEach((video, index) => {
        const item = document.createElement('div');
        item.className = 'youtube-item';
        item.innerHTML = `
            <span>${video[0]} (${video[1] || 'No time range'})</span>
            <button onclick="removeYoutubeReference(${index})">×</button>
        `;
        container.appendChild(item);
    });
}

function removeYoutubeReference(index) {
    if (!selectedNode || !selectedNode.youtube) return;
    
    selectedNode.youtube.splice(index, 1);
    nodes.update(selectedNode);
    updateYoutubeList();
}

function updatePrerequisites() {
    if (!selectedNode) return;
    
    const prerequisites = edges.get()
        .filter(edge => edge.to === selectedNode.id)
        .map(edge => edge.from);
    
    selectedNode.prerequisites = prerequisites;
    nodes.update(selectedNode);
    updatePrerequisitesList();
}

function updatePrerequisitesList() {
    const container = document.getElementById('prerequisitesList');
    container.innerHTML = '';
    
    if (!selectedNode.prerequisites) return;
    
    selectedNode.prerequisites.forEach(prereqId => {
        const prereqNode = nodes.get(prereqId);
        const item = document.createElement('div');
        item.className = 'prerequisite-item';
        item.innerHTML = `
            <span>${prereqNode.label}</span>
        `;
        container.appendChild(item);
    });
}

function generateId() {
    return Math.floor(100000 + Math.random() * 900000);
}

async function saveMap() {
    const classId = document.getElementById('classSelect').value;
    const unit = document.getElementById('unitInput').value;
    
    if (!classId || !unit) {
        alert('Please select a class and enter a unit name');
        return;
    }
    
    // Get all edges to determine prerequisites
    const allEdges = edges.get();
    const nodePrerequisites = {};
    
    // Build prerequisites map based on edges
    allEdges.forEach(edge => {
        if (!nodePrerequisites[edge.to]) {
            nodePrerequisites[edge.to] = [];
        }
        nodePrerequisites[edge.to].push(edge.from);
    });
    
    // Get node positions from the network
    const positions = network.getPositions();
    
    // Create structure object with node positions
    const structure = {
        nodes: {}
    };
    nodes.get().forEach(node => {
        const pos = positions[node.id];
        if (pos) {
            structure.nodes[node.id.toString()] = {
                x: Math.round(pos.x),
                y: Math.round(pos.y)
            };
        }
    });
    
    const mapData = {
        classID: parseInt(classId),
        unit: unit,
        id: parseInt(generateId()),
        nodes: nodes.get().map(node => ({
            id: node.id,
            label: node.label,
            description: node.description || '',
            prerequisites: nodePrerequisites[node.id] || [],
            starter_prompt: node.starterPrompt || '',
            youtube: node.youtube || []
        })),
        structure: structure,
        created_on: new Date().toISOString().split('T')[0],
        updated_on: new Date().toISOString().split('T')[0]
    };
    
    try {
        await fetchRequest('/post_data', {
            sheet: 'CMaps',
            data: mapData
        });
        alert('Map saved successfully!');
    } catch (error) {
        console.error('Error saving map:', error);
        alert('Error saving map. Please try again.');
    }
}

async function updateMap() {
    if (!currentMapId) return;
    
    const classId = document.getElementById('classSelect').value;
    const unit = document.getElementById('unitInput').value;
    
    if (!classId || !unit) {
        alert('Please select a class and enter a unit name');
        return;
    }
    
    // Get all edges to determine prerequisites
    const allEdges = edges.get();
    const nodePrerequisites = {};
    
    // Build prerequisites map based on edges
    allEdges.forEach(edge => {
        if (!nodePrerequisites[edge.to]) {
            nodePrerequisites[edge.to] = [];
        }
        nodePrerequisites[edge.to].push(edge.from);
    });
    
    // Get node positions from the network
    const positions = network.getPositions();
    
    // Create structure object with node positions
    const structure = {
        nodes: {}
    };
    nodes.get().forEach(node => {
        const pos = positions[node.id];
        if (pos) {
            structure.nodes[node.id.toString()] = {
                x: Math.round(pos.x),
                y: Math.round(pos.y)
            };
        }
    });
    
    const mapData = {
        classID: parseInt(classId),
        unit: unit,
        id: currentMapId,
        nodes: nodes.get().map(node => ({
            id: node.id,
            label: node.label,
            description: node.description || '',
            prerequisites: nodePrerequisites[node.id] || [],
            starter_prompt: node.starterPrompt || '',
            youtube: node.youtube || []
        })),
        structure: structure,
        created_on: new Date().toISOString().split('T')[0],
        updated_on: new Date().toISOString().split('T')[0]
    };
    
    try {
        await fetchRequest('/update_data', {
            sheet: 'CMaps',
            data: mapData,
            row_name: 'id',
            row_value: currentMapId
        });
        alert('Map updated successfully!');
    } catch (error) {
        console.error('Error updating map:', error);
        alert('Error updating map. Please try again.');
    }
} 