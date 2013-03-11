Pcs = Ember.Application.createWithMixins({
  LOG_TRANSITIONS: true,
  cluster_name: get_cluster_name(),
  cluster_settings: null,
  cur_page: "",
  resource_page: function() {
    if (this.cur_page == "resources") return "display: table-row;";
    else return "display: none;";
  }.property("cur_page"),
  node_page: function() {
    if (this.cur_page == "nodes") return "display: table-row;";
    else return "display: none;";
  }.property("cur_page"),
  stonith_page: function() {
    if (this.cur_page == "stonith") return "display: table-row;";
    else return "display: none;";
  }.property("cur_page"),
  configure_page: function() {
    if (this.cur_page == "configure") return "display: table-row;";
    else return "display: none;";
  }.property("cur_page"),
  manage_page: function() {
    if (this.cur_page == "manage") return "display: table-row;";
    else return "display: none;";
  }.property("cur_page"),

  update_timeout: null,
  update: function(first_run) {
    if (first_run)
      show_loading_screen();
    if (this.cluster_name == null) {
      Ember.debug("Empty Cluster Name");
      hide_loading_screen();
      return;
    }
    Ember.debug("Running ajax for: " + this.cluster_name);
    $.ajax({
      url:  "status_all",
//      url: "/test_status.json",
      dataType: "json",
      success: function(data) {
	Pcs.nodesController.update(data);
	Pcs.resourcesController.update(data);
	Pcs.settingsController.update(data);
	Pcs.set("cluster_settings",data[Object.keys(data)[0]].cluster_settings);
	Ember.run.next(this,disable_checkbox_clicks);
	if (first_run) {
	    Ember.run.next(this,function () {
	      Pcs.resourcesController.load_resource($('#resource_list_row').find('.node_selected').first(),true);
	      Pcs.resourcesController.load_stonith($('#stonith_list_row').find('.node_selected').first(),true);
	      Pcs.nodesController.load_node($('#node_list_row').find('.node_selected').first(),true);
	    });
	    Pcs.selectedNodeController.reset();
	} 
	hide_loading_screen();
	clearTimeout(Pcs.update_timeout);
	Pcs.update_timeout = window.setTimeout(Pcs.update,20000);
      },
      error: function(a,b,c) {
	hide_loading_screen();
      }

    });
  }
});

Pcs.Router.map(function() {
  this.route("Configuration", { path: "configure"});
  this.route("Fence Devices", { path: "fencedevices"});
  this.resource("Resources", {path: "resources/:resource_id"}, function () {
    this.route('new');
  });
  this.route("Resources", { path: "resources"});
  this.route("Nodes", { path: "nodes"});
//  this.resource("Resource", {path: 'resources/:resource_id'});
  this.route("Manage", {path: "manage"});
  this.route("Default Route", { path: "*x" });
});

Pcs.ManageRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    select_menu("MANAGE");
  }
});

Pcs.IndexRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    select_menu("NODES");
  }
});

Pcs.DefaultRouteRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    select_menu("NODES");
  }
});

Pcs.FenceDevicesRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    select_menu("FENCE DEVICES");
  }
});

Pcs.NodesRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    Ember.debug("Nodes Route");
    select_menu("NODES");
  }
});

Pcs.ConfigurationRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    Ember.debug("Configuration Route");
    select_menu("CONFIGURE"); 
  }
});

Pcs.ResourcesRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    Ember.debug("Resources Route");
    select_menu("RESOURCES"); 
  },
  model: function(params) {
    Ember.debug("Resource: " + params.resource_id);
    return null;
  }
});

Pcs.Setting = Ember.Object.extend({
  name: null,
  value: null,
  type: null
});

Pcs.Resource = Ember.Object.extend({
  name: null,
  cur_resource: false,
  checked: false,
  nodes_running: [],
  up: function() {
    return this.active;
  }.property("active"),
  resource_name_style: function() {
    if (this.active) {
      return "";
    } else {
      return "color:red";
    }
  }.property("active"),

  trclass: function(){
    if (this.cur_resource == true)
      return "node_selected";
    else
      return ""
  }.property("cur_resource"),
  onmouseover: function(){
    if (this.cur_resource == true)
      return ""
    else
      return "hover_over(this);"
  }.property("cur_resource"),
  onmouseout: function(){
    if (this.cur_resource == true)
      return ""
    else
      return "hover_out(this);"
  }.property("cur_resource"),
  res_class: function() {
    cpt = this.agentname.split(":");
    return cpt[0];
  }.property("agentname"),
  res_provider: function() {
    cpt = this.agentname.split(":");
    return cpt[2];
  }.property("agentname"),
  res_type: function() {
    cpt = this.agentname.split(":");
    if (this.stonith) 
      return cpt[1];
    return cpt[3];
  }.property("agentname"),
  showArrow: function(){
    if (this.cur_resource != true)
      return "display:none;"
    else
      return ""
  }.property("cur_resource"),
});

Pcs.Clusternode = Ember.Object.extend({
  name: null,
  cur_node: false,
  checked: false,
  resources_running: [],
  url: function() { return "window.location='/nodes/" + this.get("name")+"'"
  }.property(),
  trclass: function(){
    if (this.cur_node == true)
      return "node_selected";
  }.property("cur_node"),
  onmouseover: function(){
    if (this.cur_node == true)
      return ""
    else
      return "hover_over(this);"
  }.property("cur_node"),
  onmouseout: function(){
    if (this.cur_node == true)
      return ""
    else
      return "hover_out(this);"
  }.property("cur_node"),
  showArrow: function(){
    if (this.cur_node != true)
      return "display:none;"
    else
      return ""
  }.property("cur_node"),
  location_constraints: null
});

Pcs.settingsController = Ember.ArrayController.create({
  content: [],
  update: function(data) {
    var self = this;
    var settings = {};
    self.set('content',[]);
    $.each(data, function(key, value) {
      if (value["cluster_settings"]) {
	$.each(value["cluster_settings"], function(k2, v2) {
	  var setting = Pcs.Setting.create({
	    name: k2,
	    value: v2
	  });
	  self.pushObject(setting);
	});
      }
    });
  }
});

Pcs.resourcesController = Ember.ArrayController.createWithMixins({
  content: [],
  no_resources: function () {
    if (this.content.length == 0)
      return true;
    else
      return false;
  }.property("@each.content"),
  cur_resource: null,
  cur_resource_res: null,
  cur_resource_ston: null,
  init: function(){
    this._super();
  },

  load_resource: function(resource_row, dont_update_hash) {
    if (resource_row.length == 0)
      return;
    var temp_cur_resource = Pcs.resourcesController.cur_resource;
    load_row(resource_row, this, 'cur_resource', "#resource_info_div", 'cur_resource_res');
    load_agent_form(resource_row, false);
    if (!dont_update_hash)
      window.location.hash = "/resources/" + $(resource_row).attr("nodeID");

    // If we're not on the resource page, we don't update the cur_resource
    if (Pcs.cur_page != "resources") {
      Pcs.resourcesController.set('cur_resource',temp_cur_resource);
    }
  },

  load_stonith: function(resource_row, dont_update_hash) {
    if (resource_row.length == 0)
      return;
    var temp_cur_resource = Pcs.resourcesController.cur_resource;
    load_row(resource_row, this, 'cur_resource', "#stonith_info_div", 'cur_resource_ston');
    load_agent_form(resource_row, true);
    if (!dont_update_hash)
      window.location.hash = "#fencedevices#" + $(resource_row).attr("nodeID");

    // If we're not on the stonith page, we don't update the cur_resource
    if (Pcs.cur_page != "stonith")
      Pcs.resourcesController.cur_resource = temp_cur_resource;
  },

  remove_constraint: function(constraint_id) {
    $.each(this.content, function(key, value) {
      if (value.location_constraints) {
	value.set("location_constraints", $.grep(value.location_constraints, function (value2, key) {
	  if (value2.id == constraint_id)
	    return false
	  return true;
	}));
      }
      if (value.ordering_constraints) {
	value.set("ordering_constraints", $.grep(value.ordering_constraints, function (value2, key) {
	  if (value2.id == constraint_id)
	    return false
	  return true;
	}));
      }
      if (value.colocation_constraints) {
	value.set("colocation_constraints", $.grep(value.colocation_constraints, function (value2, key) {
	  if (value2.id == constraint_id)
	    return false
	  return true;
	}));
      }
    });
  },


  update: function(data) {
    var self = this;
    var resources = {};
    var ord_con = {}
    var loc_con = {}
    var col_con = {}
    var res_loc_constraints = {};
    var res_ord_constraints = {};
    var res_col_constraints = {};
    $.each(data, function(key, value) {
      if (value["resources"]) {
	$.each(value["resources"], function(k2, v2) {
	  resources[v2["id"]] = v2;
	});
      }

      if (value["constraints"]) {
	if (value["constraints"]["rsc_location"]) {
	  $.each(value["constraints"]["rsc_location"], function (key, value) {
	    loc_con[value["id"]] = value;
	  });
	}
	if (value["constraints"]["rsc_order"]) {
	  $.each(value["constraints"]["rsc_order"], function (key, value) {
	    ord_con[value["id"]] = value;
	  });
	}
	if (value["constraints"]["rsc_colocation"]) {
	  $.each(value["constraints"]["rsc_colocation"], function (key, value) {
	    col_con[value["id"]] = value;
	  });
	}
      }
    });

    $.each(loc_con, function (key, value) {
      if (value["rsc"] in res_loc_constraints)
	res_loc_constraints[value["rsc"]].push(value);
      else res_loc_constraints[value["rsc"]] = [value];
    });

    var cur_res_holder = "";
    var cur_res_holder_res = "";
    var cur_res_holder_ston = "";
    if (self.cur_resource)
      cur_res_holder = self.cur_resource.name;
    if (self.cur_resource_res)
      cur_res_holder_res = self.cur_resource_res.name;
    if (self.cur_resource_ston)
      cur_res_holder_ston = self.cur_resource_ston.name;

    self.set("cur_resource",null);
    self.set("cur_resource_res",null);
    self.set("cur_resource_ston",null);

    resources_checked = {};
    $.each(self.content, function (key, value) {
      if (value.checked)
	resources_checked[value.name] = true;
    });


    $.each(ord_con, function (key, value) {
      first = $.extend({"other_rsc":value["then"],"before":false}, value);
      if (value["first"] in res_ord_constraints)
	res_ord_constraints[value["first"]].push(first);
      else res_ord_constraints[value["first"]] = [first];
      then = $.extend({"other_rsc":value["first"],"before":true}, value);
      if (value["then"] in res_ord_constraints)
	res_ord_constraints[value["then"]].push(then);
      else res_ord_constraints[value["then"]] = [then];
    });

    $.each(col_con, function (key, value) {
      if (value["score"] == "INFINITY")
	value["together"] = "Together";
      else if (value["score"] == "-INFINITY" || value["score"] < 0)
	value["together"] = "Apart";
      else if (value["score"] >= 0)
	value["together"] = "Together";

      first = $.extend({"other_rsc":value["with-rsc"],"first":true}, value);
      if (value["rsc"] in res_col_constraints)
	res_col_constraints[value["rsc"]].push(first);
      else res_col_constraints[value["rsc"]] = [first];
      second = $.extend({"other_rsc":value["rsc"],"first":false}, value);
      if (value["with-rsc"] in res_col_constraints)
	res_col_constraints[value["with-rsc"]].push(second);
      else res_col_constraints[value["with-rsc"]] = [second];
    });

//    self.set('content',[]);
    $.each(resources, function(key, value) {
      found = false;
      var resource = null;
      $.each(self.content, function(key, pre_existing_resource) {
	if (pre_existing_resource && pre_existing_resource.name == value["id"]) {
	  found = true;
	  resource = pre_existing_resource;
	  resource.set("agentname", value["agentname"]);
	  resource.set("active", value["active"]);
	  resource.set("nodes", value["nodes"]);
	  resource.set("group", value["group"]);
	  resource.set("clone", value["clone"]);
	  resource.set("failed", value["failed"]);
	  resource.set("orphaned", value["orphaned"]);
	  resource.set("options", value["options"]);
	  resource.set("location_constraints", res_loc_constraints[value["id"]]);
	  resource.set("ordering_constraints", res_ord_constraints[value["id"]]);
	  resource.set("colocation_constraints", res_col_constraints[value["id"]]);
	  resource.set("stonith", value["stonith"]);
	}
      });
      if (found == false) {
	resource = Pcs.Resource.create({
	  name: value["id"],
	  agentname: value["agentname"],
	  active: value["active"],
	  nodes: value["nodes"],
	  group: value["group"],
	  clone: value["clone"],
	  failed: value["failed"],
	  orphaned: value["orphaned"],
	  options: value["options"],
	  location_constraints: res_loc_constraints[value["id"]],
	  ordering_constraints: res_ord_constraints[value["id"]],
	  colocation_constraints: res_col_constraints[value["id"]],
	  stonith: value["stonith"]
	});
      }
      var pathname = window.location.pathname.split('/');

      if (cur_res_holder == "") {
	cur_res_name = pathname[pathname.length-1];
      } else {
	cur_res_name = cur_res_holder;
      }
      if (resource.name == cur_res_name) {
	resource.set("cur_resource",true);
	self.set("cur_resource", resource);
      }

      if (resource.name == cur_res_holder_res) {
	resource.set("cur_resource",true);
	self.set("cur_resource_res", resource);
      }

      if (resource.name == cur_res_holder_ston) {
	resource.set("cur_resource",true);
	self.set("cur_resource_ston", resource);
      }

      if (resources_checked[resource.name])
	resource.set('checked', true);

      if (found == false)
	self.pushObject(resource);
    });
    if (self.content && self.content.length > 0 && self.cur_resource == null) {
      for (var i=0; i< self.content.length; i++) {
	if (self.content[i].stonith) {
	  self.set("cur_resource_ston", self.content[i]);
	  self.content[i].set("cur_resource",true);
	  break;
	}
      }
      for (var i=0; i< self.content.length; i++) {
	if (!self.content[i].stonith) {
	  self.set("cur_resource_res", self.content[i]);
	  self.content[i].set("cur_resource",true);
	  break;
	}
      }
      if (Pcs.cur_page == "resources")
	self.set("cur_resource", self.cur_resource_res);
      if (Pcs.cur_page == "stonith") {
	self.set("cur_resource", self.cur_resource_ston);
      }
    }
  }
});

Pcs.selectedNodeController = Ember.Object.create({
  node: null,
  reset: function() {
    if (Pcs.nodesController)
      this.set('node', Pcs.nodesController.objectAt(0));
  }
});

Pcs.nodesController = Ember.ArrayController.createWithMixins({
  content: [],
  cur_node: null,
  init: function(){
    this._super();
  },

  load_node: function(node_row, dont_update_hash){
    load_row(node_row, this, 'cur_node', '#node_info_div');
    if (!dont_update_hash)
      window.location.hash = "#nodes#" + $(node_row).attr("nodeID");
  },

  update: function(data){
    var self = this;
    var nodes = [];
    corosync_nodes_online = [];
    pacemaker_nodes_online = [];
    $.each(data, function(key, value) {
      nodes.push(key);
      if (value["corosync_online"])
	corosync_nodes_online = corosync_nodes_online.concat(value["corosync_online"]);
      if (value["pacemaker_online"])
	pacemaker_nodes_online = pacemaker_nodes_online.concat(value["pacemaker_online"]);
    });
    nodes.sort();
    var resources_on_nodes = {};
    var lc_on_nodes = {};
    $.each(data, function(node, node_info) {
      resources_on_nodes[node] = [];
      lc_on_nodes[node] = [];
      if (node_info["resources"]) {
	$.each(node_info["resources"], function(key, resource) {
	  $.each(resource["nodes"], function(node_key, resource_on_node) {
	    if (resources_on_nodes[resource_on_node])
	      resources_on_nodes[resource_on_node].push(resource["id"] + " (" +
							resource["agentname"] + ")");
	    else
	      resources_on_nodes[resource_on_node] = [resource["id"] + " (" +
		resource["agentname"] + ")"];
	  });
	});
      }
      if (node_info["constraints"] && node_info["constraints"]["rsc_location"]) {
	$.each(node_info["constraints"]["rsc_location"], function(key, constraint) {
	  if (constraint["node"] == node)
	    lc_on_nodes[node].push(constraint)
	});
      }
    });

    var nodes_checked = {};
    var cur_node_holder = "";
    if (self.cur_node)
      cur_node_holder = self.cur_node.name;
    $.each(self.content, function (key, value) {
      if (value.checked)
	nodes_checked[value.name] = true;
    });

//    self.set('content',[]);
    $.each(nodes, function(key, node_id) {
      if ($.inArray(node_id, corosync_nodes_online) > -1) {
	corosync_online = true;
      } else {
	corosync_online = false;
      }
      if ($.inArray(node_id, pacemaker_nodes_online) > -1) {
	pacemaker_online = true;
      } else {
	pacemaker_online = false;
      }

      if (data[node_id]["noresponse"] == true) {
	pcsd_daemon = false
      } else {
	pcsd_daemon = true
      }

      if (data[node_id]["notauthorized"] == "true") {
	authorized = false;
      } else {
	authorized = true;
      }

      if (data[node_id]["corosync"] && data[node_id]["pacemaker"] &&
		pacemaker_online && corosync_online) {
	up_status = true;
      } else {
       up_status = false;
      }       

      found = false;
      var node = null;
      $.each(self.content, function(key, pre_existing_node) {
	if (pre_existing_node && pre_existing_node.name == node_id) {
	  node = pre_existing_node;
	  found = true;
	  node.authorized =  authorized;
	  node.set("up",up_status);
	  node.set("pcsd",pcsd_daemon && authorized);
	  node.set("corosync_daemon", data[node_id]["corosync"]);
	  node.set("pacemaker_daemon", data[node_id]["pacemaker"]);
	  node.set("corosync", corosync_online);
	  node.set("pacemaker", pacemaker_online);
	  node.set("cur_node",false);
	  node.set("running_resources", $.unique(resources_on_nodes[node_id].sort().reverse()));
	  node.set("location_constraints", lc_on_nodes[node_id].sort());
	  node.set("uptime", data[node_id]["uptime"]);
	}
      });

      if (found == false) {
	var node = Pcs.Clusternode.create({
	  name: node_id,
	  authorized:  authorized,
	  up: up_status,
	  pcsd: pcsd_daemon && authorized,
	  corosync_daemon: data[node_id]["corosync"],
	  pacemaker_daemon: data[node_id]["pacemaker"],
	  corosync: corosync_online,
	  pacemaker: pacemaker_online,
	  cur_node: false,
	  running_resources: $.unique(resources_on_nodes[node_id].sort().reverse()),
	  location_constraints: lc_on_nodes[node_id].sort(),
	  uptime: data[node_id]["uptime"]
	});
      }
      var pathname = window.location.pathname.split('/');

      if (cur_node_holder == "") {
	cur_node_name = pathname[pathname.length-1];
      } else {
	cur_node_name = cur_node_holder;
      }
      if (node.name == cur_node_name) {
	node.set("cur_node",true);
	self.set("cur_node", node);
      }

      if (nodes_checked[node.name])
	node.set("checked",true);

      if (found == false)
	self.pushObject(node);
    });
    if (self.content && self.content.length > 0 && self.cur_node == null) {
      self.set("cur_node", self.content[0]);
      self.content[0].set("cur_node",true);
    }
  }
});

function myUpdate() {
  Pcs.update();
//  window.setTimeout(myUpdate,4000);
}

Pcs.update(true);