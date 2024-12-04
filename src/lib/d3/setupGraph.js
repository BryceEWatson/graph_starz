import * as d3 from 'd3';

export function setupGraph(svgElement, data, width, height) {
    // Set up the force simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));

    // Set up zoom behavior (disabled)
    const zoom = d3.zoom()
        .scaleExtent([1, 1])
        .on('zoom', (event) => {
            container.attr('transform', event.transform);
        });

    svgElement.call(zoom);

    // Create a container for the graph
    const container = svgElement.append('g');

    // Create the links
    const links = container.append('g')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke', '#6b7280')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2)
        .attr('class', 'graph-link')
        .attr('stroke-linecap', 'round');

    // Create the nodes
    const nodes = container.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'graph-node')
        .call(d3.drag()
            .on('start', (event) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            })
            .on('drag', (event) => {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            })
            .on('end', (event) => {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            })
        );

    return { simulation, container, nodes, links };
}
