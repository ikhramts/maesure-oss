using Server.Config;
using System.Text.RegularExpressions;

namespace Server.Controllers.Routing
{
    public class Router
    {
        public Router(BackendRoutes backendRoutes)
        {
            _backendRoutes = backendRoutes;
        }

        public RouteResult Route(string requestedPath, bool isAuthenticated)
        {
            // Strip the URL query.
            var questionMarkPosition = requestedPath.IndexOf('?');

            if (questionMarkPosition != -1)
            {
                requestedPath = requestedPath.Substring(0, questionMarkPosition);
            }

            // Check whether we should route the request to downloads.
            if (Regex.IsMatch(requestedPath, "^/downloads/"))
            {
                var strippedDownloadsPath = requestedPath.Substring("/downloads".Length);
                return new RouteResult
                {
                    BackendPath = _backendRoutes.Downloads + strippedDownloadsPath,
                };
            }

            // Route the request to the dashboard.
            var adjustedPath = AdjustForFrontEndRouting(requestedPath);

            return new RouteResult
            {
                BackendPath = _backendRoutes.Dashboard + adjustedPath
            };
        }


        public class RouteResult
        {
            public string BackendPath { get; set; }
            public bool ShouldChallenge { get; set; } = false;
            public string RedirectTo { get; set; }
        }

        // ================ Private =================
        BackendRoutes _backendRoutes;

        private static string AdjustForFrontEndRouting(string requestedPath)
        {
            // Strip any leading folders.
            var pathWithoutFolders = requestedPath;
            var lastSlash = requestedPath.LastIndexOf('/');

            if (lastSlash != -1)
            {
                pathWithoutFolders = requestedPath.Substring(lastSlash);
            }

            // Check if the remaining path is a file.
            if (!pathWithoutFolders.Contains('.'))
                return "/";

            return pathWithoutFolders;
        }
    }
}
