"use strict";

module.exports = {
  routes: {
    "" : "index"
  },

  index: function(ctx, api) {
    var template_str = api.template.render("controllers/home/home.html.erb");
    this.set_fullscreen(true);
    this.set_title("What Next?");
    api.page.render({ content: template_str});
  },

  socket: function() {}
};
