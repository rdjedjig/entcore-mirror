package org.entcore.admin.controllers.api;

import io.vertx.core.http.HttpServerRequest;

public interface IPlatformInfoController {
    /**
     * QUE METTRE ICI pour décrire 
     * - Le verbe (GET, POST...),
     * - Le Content-Type,
     * - Les éventuels query-parameters ou matrix-parameters,
     * - Le format du payload (body) attendu x-www-form-urlencoded, multipart/form-data
     * ...
     * @param request
     */
    public void moduleSms(HttpServerRequest request);

    /**
     * 
     * @param request
     */
    public void readConfig(HttpServerRequest request);
}
