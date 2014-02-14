Installation of inkscopeViz
---------------------------

1. Download all the directories of the inkScope project to a folder of your choice
    *in the following stages, we have chosen /var/www/inkscope*

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

6. Enable proxy module in Apache (if not already enabled)

        sudo a2enmod proxy_http
        sudo service apache2 restart

7. Enable InkScopeViz virtual host:

        sudo a2ensite inkScopeViz

    No need to restart Apache at this time

8. Install inkscopeCtrl

    - install mod-wgsi for Apache

         sudo apt-get install libapache2-mod-wsgi

    - install python dependencies

         sudo pip install pymongo

    - add inkscopeCtrl in */etc/apache2/sites-available/inkScopeViz.conf*

        WSGIScriptAlias /inkscopeCtrl /var/www/inkscope/inkscopeCtrl/mongoJuice.wsgi
        <Directory "/var/www/inkscope/inkscopeCtrl">
            Order allow,deny
            Allow from all
        </Directory>

    - restart Apache

        sudo service apache2 restart

