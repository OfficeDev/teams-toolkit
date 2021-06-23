import os
import errno

exts = ["js", "ts"]
scenarios = ["default"]
me_file_name = "messageExtensionBot"
bot_file_name = "teamsBot"
combined_file_name = "./bot-msgext/teamsBot"
for ext in exts:
    for scenario in scenarios:
        me_file = "./templates/msgext/{}/{}/{}.{}".format(ext, scenario, me_file_name, ext)
        bot_file = "./templates/bot/{}/{}/{}.{}".format(ext, scenario, bot_file_name, ext)
        combined_file = "./templates/bot-msgext/{}/{}/{}.{}".format(ext, scenario, bot_file_name, ext)
        if not os.path.exists(os.path.dirname(combined_file)):
            try:
                os.makedirs(os.path.dirname(combined_file))
            except OSError as exc:  # Guard against race condition
                if exc.errno != errno.EEXIST:
                    raise
                
        bot_fh = open(bot_file)
        bot_content = bot_fh.readlines()
        me_fh = open(me_file)
        me_content = me_fh.readlines()

        # merge pkg reference
        for line in me_content:
            if not line.startswith(("import", "const")):
                break
            if "botbuilder" not in line and line not in bot_content:
                bot_content.insert(0, line)

        # merge functions in TeamsActivityHandler class
        function_lines = []
        me_class_no = [id for id, s in enumerate(me_content) if "extends TeamsActivityHandler" in s][0]
        bot_class_end = [id for id, s in enumerate(bot_content) if s.rstrip() == "}"][0]

        me_class_end = me_class_no
        for i in range(me_class_no + 1, len(me_content)):
            if me_content[i].rstrip() != "}":
                function_lines.append(me_content[i])
            else:
                me_class_end = i
                break
        function_lines.insert(0, "\n  // Message Extension Code\n")
        bot_content[bot_class_end: bot_class_end] = function_lines
        bot_class_end += len(function_lines) + 1

        # merge functions out of TeamsActivityHandler class
        function_lines = []
        for i in range(me_class_end + 1, len(me_content)):
            if "module.exports" in me_content[i]:
                break
            function_lines.append(me_content[i])
        bot_content[bot_class_end + 1: bot_class_end + 1] = function_lines

        combined_hd = open(combined_file, 'w')
        combined_hd.writelines(bot_content)

        bot_fh.close()
        me_fh.close()
        combined_hd.close()
