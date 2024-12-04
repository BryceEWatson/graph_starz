export function applyStyles(svgElement, nodes, links) {
    // Add drop shadow filter
    const defs = svgElement.append('defs');
    const filter = defs.append('filter')
        .attr('id', 'drop-shadow')
        .attr('height', '130%');

    filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 2)
        .attr('result', 'blur');

    filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 1)
        .attr('dy', 1)
        .attr('result', 'offsetBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
        .attr('in', 'offsetBlur');
    feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');

    // Add circles for nodes with improved styling
    nodes.append('circle')
        .attr('r', d => {
            switch (d.type) {
                case 'user': return 8;
                case 'image': return 10;
                case 'attribute': return 6;
                default: return 7;
            }
        })
        .attr('fill', d => {
            switch (d.type) {
                case 'user': return '#4299e1';
                case 'image': return '#48bb78';
                case 'attribute': return '#ed8936';
                default: return '#a0aec0';
            }
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('filter', 'url(#drop-shadow)');

    // Add text labels with improved visibility
    nodes.append("text")
        .attr("dx", d => d.type === 'image' ? 20 : 15)
        .attr("dy", ".35em")
        .attr("fill", "var(--graph-text)")
        .attr("stroke", "none")
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.2)")
        .text(d => d.label);
}
