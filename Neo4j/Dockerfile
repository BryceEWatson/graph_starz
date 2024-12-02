FROM neo4j:5.15.0

# Copy configuration
COPY neo4j.conf /conf/neo4j.conf

# Install APOC plugin
RUN wget -P /var/lib/neo4j/plugins https://github.com/neo4j/apoc/releases/download/5.15.0/apoc-5.15.0-core.jar

# Set password
ENV NEO4J_AUTH=neo4j/development_password

# Expose ports
EXPOSE 7474 7473 7687

# Set data directory
VOLUME /data
