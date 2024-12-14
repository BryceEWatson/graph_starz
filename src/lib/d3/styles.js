import './selection/styles.css';

export function applyStyles(svgElement, nodes, links, theme) {
    // Apply theme-based styles
    const colors = theme === 'dark' ? {
        nodeFill: '#4b5563',
        nodeStroke: '#1f2937',
        linkStroke: '#6b7280',
        textFill: '#d1d5db'
    } : {
        nodeFill: '#4b5563',
        nodeStroke: '#1f2937',
        linkStroke: '#6b7280',
        textFill: '#4b5563'
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

    // Return style configurations to be applied in setupGraph
    return {
        node: {
            circle: {
                fill: colors.nodeFill,
                stroke: colors.nodeStroke,
                strokeWidth: 2,
                filter: 'url(#drop-shadow)'
            },
            text: {
                fill: colors.textFill,
                dx: d => d.type === 'image' ? 20 : 15,
                dy: '.35em',
                stroke: 'none',
                fontSize: '12px',
                fontWeight: '500',
                textShadow: theme === 'dark' ? 
                    '0px 1px 3px rgba(0,0,0,0.4)' : 
                    '1px 1px 2px rgba(0,0,0,0.2)'
            }
        },
        link: {
            stroke: colors.linkStroke,
            strokeWidth: 2,
            strokeOpacity: 0.6
        }
    };
}
