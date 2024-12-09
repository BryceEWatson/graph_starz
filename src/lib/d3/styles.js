export function applyStyles(svgElement, nodes, links, theme) {
    const isDark = theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Colors based on theme
    const colors = {
        user: isDark ? '#60a5fa' : '#4299e1',      // Brighter blue in dark mode
        image: isDark ? '#4ade80' : '#48bb78',      // Brighter green in dark mode
        color: isDark ? '#fb923c' : '#ed8936',      // Brighter orange in dark mode
        object: isDark ? '#a78bfa' : '#9061f9',     // Brighter purple in dark mode
        default: isDark ? '#9ca3af' : '#a0aec0'     // Slightly brighter gray in dark mode
    };

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
                case 'color': return 6;
                case 'object': return 6;
                default: return 7;
            }
        })
        .attr('fill', d => {
            switch (d.type) {
                case 'user': return colors.user;
                case 'image': return colors.image;
                case 'color': return colors.color;
                case 'object': return colors.object;
                default: return colors.default;
            }
        })
        .attr('stroke', isDark ? '#374151' : '#fff')  // Darker stroke in dark mode
        .attr('stroke-width', 2)
        .style('filter', 'url(#drop-shadow)');

    // Add text labels with improved visibility
    nodes.append("text")
        .attr("dx", d => d.type === 'image' ? 20 : 15)
        .attr("dy", ".35em")
        .attr("fill", isDark ? '#e2e8f0' : '#2d3748')  // Theme-aware text color
        .attr("stroke", "none")
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .style("text-shadow", isDark ? "0px 1px 3px rgba(0,0,0,0.4)" : "1px 1px 2px rgba(0,0,0,0.2)")
        .text(d => {
            switch (d.type) {
                case 'user':
                    return d.name || d.email || 'User';
                case 'image':
                    return d.name || d.properties?.title || 'Untitled Image';
                case 'color':
                    return `Color: ${d.name || d.properties?.name}`;
                case 'object':
                    return `Object: ${d.name || d.properties?.name}`;
                default:
                    return d.name || d.type || 'Node';
            }
        });
}
