import networkx as nx
import matplotlib.pyplot as plt
import os
import re
from matplotlib.colors import LinearSegmentedColormap

def parse_concept_map(file_path):
    """Parse the concept map file to extract nodes and connections."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract node information
    nodes_section = re.search(r'## Nodes\s+(.*?)(?=##|\Z)', content, re.DOTALL).group(1).strip()
    node_patterns = re.findall(r'^(\d+)\.\s+(.*?)$(?:\s+Content:.*?$)?', nodes_section, re.MULTILINE)
    
    nodes = {}
    for num, name in node_patterns:
        nodes[int(num)] = name.strip()
    
    # Extract connection information
    connections_section = re.search(r'## Connections\s+(.*?)(?=##|\Z)', content, re.DOTALL).group(1).strip()
    connection_lines = connections_section.split('\n')
    
    edges = []
    for line in connection_lines:
        if '=>' in line:
            source, target = line.split('=>', 1)
            source = source.strip()
            target = target.strip().split('\n', 1)[0]
            if source in [nodes[k] for k in nodes] and target in [nodes[k] for k in nodes]:
                edges.append((source, target))
    
    return nodes, edges

def create_concept_map_image(map_file, output_file, alt_output_file=None):
    """Create a visualization of the concept map."""
    nodes, edges = parse_concept_map(map_file)
    
    # Create a directed graph
    G = nx.DiGraph()
    
    # Add nodes with their labels
    for node_id, node_name in nodes.items():
        G.add_node(node_name, id=node_id)
    
    # Add edges
    for source, target in edges:
        G.add_edge(source, target)
    
    # Set up the figure with a larger size
    plt.figure(figsize=(24, 16))
    
    # Create categories of nodes
    parametric_nodes = ["Complex Curves", "Parametric Basics", "Parameter Elimination", "Parametric Derivatives", "Second Derivatives Parametric", "Arc Length Parametric"]
    polar_nodes = ["Circular Phenomena", "Polar Coordinates", "Polar to Cartesian", "Polar Derivatives", "Second Derivatives Polar", "Arc Length Polar", "Area Polar", "Bounded Regions"]
    vector_nodes = ["Motion in Space", "Vector Functions", "Vector Derivatives", "Motion Position", "Motion Velocity", "Motion Acceleration", "Curve Orientation", "Unit Tangent Vector", "Unit Normal Vector", "Unit Binormal Vector", "Path Curvature", "Curvature", "Path Measurement"]
    
    # Set node colors based on category
    node_colors = []
    for node in G.nodes():
        if node in parametric_nodes:
            node_colors.append('lightcoral')
        elif node in polar_nodes:
            node_colors.append('lightblue')
        elif node in vector_nodes:
            node_colors.append('lightgreen')
        else:
            node_colors.append('white')
    
    # Use a spring layout
    pos_spring = nx.spring_layout(G, k=0.5, iterations=100, seed=42)
    
    # Draw the graph with spring layout
    nx.draw_networkx_nodes(G, pos_spring, node_size=4000, node_color=node_colors, edgecolors='black', linewidths=2, alpha=0.8)
    nx.draw_networkx_edges(G, pos_spring, width=1.5, alpha=0.7, arrowsize=20, arrowstyle='->', connectionstyle='arc3,rad=0.1')
    nx.draw_networkx_labels(G, pos_spring, font_size=10, font_weight='bold')
    
    # Remove axis
    plt.axis('off')
    
    # Add a title
    plt.title("Calculus BC: Polar, Parametric, and Vector-Valued Functions Concept Map (Spring Layout)", fontsize=24, pad=20)
    
    # Add a legend
    plt.scatter([], [], color='lightcoral', label='Parametric Concepts', s=100, edgecolors='black')
    plt.scatter([], [], color='lightblue', label='Polar Concepts', s=100, edgecolors='black')
    plt.scatter([], [], color='lightgreen', label='Vector Concepts', s=100, edgecolors='black')
    plt.legend(fontsize=16, loc='best')
    
    # Save the figure
    plt.tight_layout()
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Spring layout concept map saved to {output_file}")
    
    # If alt_output_file is provided, create a second visualization with kamada_kawai_layout
    if alt_output_file:
        plt.figure(figsize=(24, 16))
        
        # Use Kamada-Kawai layout for better node spacing
        try:
            pos_kk = nx.kamada_kawai_layout(G, scale=2.0)
            
            # Draw the graph with Kamada-Kawai layout
            nx.draw_networkx_nodes(G, pos_kk, node_size=4000, node_color=node_colors, edgecolors='black', linewidths=2, alpha=0.8)
            nx.draw_networkx_edges(G, pos_kk, width=1.5, alpha=0.7, arrowsize=20, arrowstyle='->', connectionstyle='arc3,rad=0.1')
            nx.draw_networkx_labels(G, pos_kk, font_size=10, font_weight='bold')
            
            # Remove axis
            plt.axis('off')
            
            # Add a title
            plt.title("Calculus BC: Polar, Parametric, and Vector-Valued Functions Concept Map (Kamada-Kawai Layout)", fontsize=24, pad=20)
            
            # Add a legend
            plt.scatter([], [], color='lightcoral', label='Parametric Concepts', s=100, edgecolors='black')
            plt.scatter([], [], color='lightblue', label='Polar Concepts', s=100, edgecolors='black')
            plt.scatter([], [], color='lightgreen', label='Vector Concepts', s=100, edgecolors='black')
            plt.legend(fontsize=16, loc='best')
            
            # Save the figure
            plt.tight_layout()
            plt.savefig(alt_output_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            print(f"Kamada-Kawai layout concept map saved to {alt_output_file}")
        except Exception as e:
            print(f"Error creating Kamada-Kawai layout: {e}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Path to the concept map file and output images
    map_file = os.path.join(script_dir, "CalcBCPolarParametric.txt")
    output_file = os.path.join(script_dir, "CalcBCPolarParametric_Map_Spring.png")
    alt_output_file = os.path.join(script_dir, "CalcBCPolarParametric_Map_KK.png")
    
    create_concept_map_image(map_file, output_file, alt_output_file) 