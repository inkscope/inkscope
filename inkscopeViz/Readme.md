Visualize dynamically ceph cluster status and relations between ceph cluster objects.
-------------------------------------------------------------------------------------

 It's based on **AngularJS** framework and **D3JS** graphic library
 The installation uses an **Apache** server to solve cross-domain call issues.

 At this stage of development, data are taken directly via Ceph rest API calls.
 It will take further data from a MongoDb database.

Installation
------------

1. Download this directory to a folder of your choice

2. Install Apache V2

3. Choose a tcp port for inkScopeViz
    *in the following stages, we have chosen 8080*

4. Modify Apache conf file /etc/apache2/port.conf to add the following line

        Listen 8080

5. Create a virtual host named **inkScopeViz**
in the folder */etc/apache2/sites-available* ,
create a file *inkScopeViz.conf* with this content:

        <VirtualHost *:8080>
            ServerName  localhost
            ServerAdmin webmaster@localhost

            DocumentRoot {inkScopeViz_folder}
            <Directory "{inkScopeViz_folder}">
                Options All
                AllowOverride All
                Require all granted
            </Directory>

            ScriptAlias /cgi-bin/ /usr/lib/cgi-bin/
            <Directory "/usr/lib/cgi-bin">
                AllowOverride None
                Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch
                Order allow,deny
                Allow from all
            </Directory>

            ErrorLog ${APACHE_LOG_DIR}/error.log

            # Possible values include: debug, info, notice, warn, error, crit,
            # alert, emerg.
            LogLevel warn

            ProxyRequests Off  # we don't want a "forward proxy", but only a "Reverse proxy"
            ProxyPass /ceph-rest-api/ {ceph_rest_api_url}

            CustomLog ${APACHE_LOG_DIR}/access.log combined
        </VirtualHost>

    Be sure to modify *{inkScopeViz_folder}* and *{ceph_rest_api_url}* with the appropriate values

6. Enable InkScopeViz virtual host:

        sudo a2ensite inkScopeViz

    you don't have to restart Apache
