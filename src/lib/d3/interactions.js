import * as d3 from 'd3';
import { setupHoverInteractions } from './interactions/hover';

export function setupInteractions(nodes, links, labels, simulation) {
    // Store element references in node data
    nodes.each(function(d) {
        d.element = this;
    });

    // Set up hover interactions with click lock support
    const cleanup = setupHoverInteractions(nodes, links);

    // Add drag behavior only if simulation exists
    if (simulation) {
        const drag = d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);

        nodes.call(drag);

        function dragstarted(event) {
            if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
            
            // Add dragging class for visual feedback
            d3.select(event.sourceEvent.target.parentNode)
                .classed('dragging', true);
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active && simulation) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
            
            // Remove dragging class
            d3.select(event.sourceEvent.target.parentNode)
                .classed('dragging', false);
        }
    }

    // Return cleanup function
    return () => {
        if (cleanup) cleanup();
        nodes.on('.drag', null); // Remove drag behavior
    };
}
